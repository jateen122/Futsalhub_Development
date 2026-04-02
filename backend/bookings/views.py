# backend/bookings/views.py
from datetime import datetime as dt_datetime
from decimal import Decimal

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Booking, LoyaltyRecord, ReschedulingToken, LOYALTY_THRESHOLD, CANCEL_WINDOW_HOURS
from .serializers import (
    BookingSerializer,
    BookingStatusSerializer,
    LoyaltySerializer,
    ReschedulingTokenSerializer,
)
from .permissions import IsPlayer, IsBookingOwner, IsOwnerOfGround


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/bookings/create/
# ─────────────────────────────────────────────────────────────────────────────

class CreateBookingView(generics.CreateAPIView):
    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlayer]

    def perform_create(self, serializer):
        ground       = serializer.validated_data.get("ground")
        start_time   = serializer.validated_data.get("start_time")
        booking_date = serializer.validated_data.get("date")

        if not ground.is_approved:
            raise ValidationError("This ground is not yet approved and cannot be booked.")

        # ── Check blocked slots ───────────────────────────────────────────────
        if start_time and booking_date:
            is_blocked, block_reason = ground.is_slot_blocked(booking_date, start_time.hour)
            if is_blocked:
                raise ValidationError(
                    f"This time slot is blocked by the owner: {block_reason or 'Unavailable'}. "
                    "Please choose a different time."
                )

        # ── Dynamic pricing ───────────────────────────────────────────────────
        if start_time and booking_date and not self.request.data.get("is_free_booking"):
            effective_price = ground.get_price_for_slot(booking_date, start_time.hour)
            end_time = serializer.validated_data.get("end_time")
            if end_time:
                start_dt    = dt_datetime.combine(dt_datetime.today(), start_time)
                end_dt      = dt_datetime.combine(dt_datetime.today(), end_time)
                duration_hr = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
                total_price = (effective_price * duration_hr).quantize(Decimal("0.01"))
            else:
                total_price = effective_price
        else:
            total_price = serializer.validated_data.get("total_price", ground.price_per_hour)

        is_free = bool(self.request.data.get("is_free_booking", False))

        # ── Check rescheduling token ──────────────────────────────────────────
        token_uuid = self.request.data.get("rescheduling_token")
        token_obj  = None
        if token_uuid:
            try:
                token_obj = ReschedulingToken.objects.get(
                    token=token_uuid,
                    user=self.request.user,
                    original_ground=ground,
                )
                if not token_obj.is_valid():
                    raise ValidationError("Rescheduling token is expired or already used.")
                total_price = Decimal("0.00")
                is_free     = True
            except ReschedulingToken.DoesNotExist:
                raise ValidationError("Invalid rescheduling token. It must be for this ground.")

        if is_free and not token_obj:
            record = LoyaltyRecord.get_or_create_for(self.request.user, ground)
            if record.free_bookings_available <= 0:
                raise ValidationError("No free bookings available for this ground.")
            record.redeem_free_booking()

        booking = serializer.save(
            user            = self.request.user,
            status          = Booking.Status.PENDING,
            total_price     = total_price,
            is_free_booking = is_free,
        )

        if token_obj:
            token_obj.redeem()

        return booking

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = self.perform_create(serializer)
        return Response(
            {"message": "Booking created successfully.", "booking": BookingSerializer(booking).data},
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/bookings/<id>/cancel/
# Decreases loyalty count + issues rescheduling token if eligible
# ─────────────────────────────────────────────────────────────────────────────

class CancelBookingView(generics.UpdateAPIView):
    queryset           = Booking.objects.all()
    serializer_class   = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsBookingOwner]
    http_method_names  = ["patch"]

    def patch(self, request, *args, **kwargs):
        booking = self.get_object()

        if booking.status in [Booking.Status.CANCELLED, Booking.Status.REFUNDED]:
            return Response(
                {"detail": f"Booking is already {booking.status} and cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        was_confirmed = (booking.status == Booking.Status.CONFIRMED)

        # Only issue token for non-free, non-rescheduled bookings
        token_issued = None
        eligible_for_token = (
            booking.can_cancel_with_token()
            and not booking.is_free_booking
            and booking.total_price > 0
        )

        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status"])

        # ── Decrease loyalty points if booking was confirmed ──────────────────
        # Only for non-free bookings that previously earned a loyalty point
        if was_confirmed and not booking.is_free_booking and booking.total_price > 0:
            try:
                record = LoyaltyRecord.objects.get(user=booking.user, ground=booking.ground)
                record.decrease_confirmed_booking()
            except LoyaltyRecord.DoesNotExist:
                pass  # No loyalty record — nothing to decrease

        # ── Issue rescheduling token if eligible ──────────────────────────────
        if eligible_for_token:
            token_obj    = ReschedulingToken.create_for_booking(booking)
            token_issued = ReschedulingTokenSerializer(token_obj).data

        response_data = {
            "message":      "Booking cancelled successfully.",
            "booking":      BookingStatusSerializer(booking).data,
            "token_issued": token_issued,
        }

        if token_issued:
            response_data["token_message"] = (
                f"You cancelled more than {CANCEL_WINDOW_HOURS} hours before your slot. "
                f"A rescheduling token worth Rs {booking.total_price} has been issued. "
                f"Use it to book the same ground within 30 days."
            )
        else:
            hours = round(booking.hours_until_slot(), 1)
            if hours < CANCEL_WINDOW_HOURS and not booking.is_free_booking:
                response_data["token_message"] = (
                    f"No rescheduling token issued — cancellation was less than "
                    f"{CANCEL_WINDOW_HOURS} hours before the slot ({hours}h remaining)."
                )
            elif booking.is_free_booking:
                response_data["token_message"] = (
                    "Free bookings and rescheduling-token bookings cannot generate a new token on cancellation."
                )

        return Response(response_data)


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/bookings/<id>/update/   (owner confirms or cancels)
# ─────────────────────────────────────────────────────────────────────────────

class UpdateBookingStatusView(generics.UpdateAPIView):
    queryset           = Booking.objects.all()
    serializer_class   = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOfGround]
    http_method_names  = ["patch"]

    def get_object(self):
        booking = super().get_object()
        if booking.ground.owner != self.request.user:
            raise PermissionDenied("You do not own the ground this booking is for.")
        return booking

    def patch(self, request, *args, **kwargs):
        booking    = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["confirmed", "cancelled"]:
            return Response(
                {"detail": "Status must be 'confirmed' or 'cancelled'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status     = booking.status
        booking.status = new_status
        booking.save(update_fields=["status"])

        if (
            new_status == "confirmed"
            and old_status != "confirmed"
            and not booking.is_free_booking
        ):
            khalti_already_paid = booking.payments.filter(
                status="success", payment_method="khalti",
            ).exists()

            if not khalti_already_paid:
                record = LoyaltyRecord.get_or_create_for(booking.user, booking.ground)
                record.record_confirmed_booking()

        # If owner cancels a confirmed booking, decrease loyalty
        if (
            new_status == "cancelled"
            and old_status == "confirmed"
            and not booking.is_free_booking
            and booking.total_price > 0
        ):
            try:
                record = LoyaltyRecord.objects.get(user=booking.user, ground=booking.ground)
                record.decrease_confirmed_booking()
            except LoyaltyRecord.DoesNotExist:
                pass

        return Response({
            "message": f"Booking {new_status}.",
            "booking": BookingStatusSerializer(booking).data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/my/
# ─────────────────────────────────────────────────────────────────────────────

class UserBookingsView(generics.ListAPIView):
    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Booking.objects.filter(
            user=self.request.user
        ).select_related("user", "ground")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.lower())

        return qs


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/owner/
# ─────────────────────────────────────────────────────────────────────────────

class OwnerBookingsView(generics.ListAPIView):
    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOfGround]

    def get_queryset(self):
        qs = Booking.objects.filter(
            ground__owner=self.request.user
        ).select_related("user", "ground")

        if ground_id := self.request.query_params.get("ground_id"):
            qs = qs.filter(ground_id=ground_id)
        if status_filter := self.request.query_params.get("status"):
            qs = qs.filter(status=status_filter.lower())
        if date_filter := self.request.query_params.get("date"):
            qs = qs.filter(date=date_filter)

        return qs


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/loyalty/
# ─────────────────────────────────────────────────────────────────────────────

class UserLoyaltyView(generics.ListAPIView):
    serializer_class   = LoyaltySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            LoyaltyRecord.objects
            .filter(user=self.request.user)
            .select_related("ground", "ground__owner")
            .order_by("-updated_at")
        )

    def list(self, request, *args, **kwargs):
        qs         = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        total_free = sum(r.free_bookings_available for r in qs)
        return Response({
            "total_free_available": total_free,
            "loyalty_records":      serializer.data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/loyalty/<ground_id>/
# ─────────────────────────────────────────────────────────────────────────────

class GroundLoyaltyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, ground_id):
        from grounds.models import Ground
        try:
            ground = Ground.objects.get(pk=ground_id)
        except Ground.DoesNotExist:
            return Response({"detail": "Ground not found."}, status=404)

        record = LoyaltyRecord.get_or_create_for(request.user, ground)
        return Response({
            "ground_id":               ground.id,
            "ground_name":             ground.name,
            "confirmed_count":         record.confirmed_count,
            "free_bookings_earned":    record.free_bookings_earned,
            "free_bookings_used":      record.free_bookings_used,
            "free_bookings_available": record.free_bookings_available,
            "bookings_until_next_free":record.bookings_until_next_free,
            "progress_to_next_free":   record.progress_to_next_free,
            "loyalty_threshold":       LOYALTY_THRESHOLD,
        })


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/ground/<ground_id>/booked-slots/
# ─────────────────────────────────────────────────────────────────────────────

class GroundBookedSlotsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, ground_id):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"detail": "date query param is required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booked = Booking.objects.filter(
            ground_id=ground_id,
            date=date_str,
        ).exclude(
            status__in=["cancelled", "refunded"]
        ).values("start_time", "end_time")

        slots = [
            {"start": str(b["start_time"]), "end": str(b["end_time"])}
            for b in booked
        ]
        return Response({"booked_slots": slots})


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/tokens/
# ─────────────────────────────────────────────────────────────────────────────

class UserReschedulingTokensView(generics.ListAPIView):
    serializer_class   = ReschedulingTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ReschedulingToken.objects
            .filter(user=self.request.user)
            .select_related("original_ground")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        qs         = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        valid      = [t for t in qs if t.is_valid()]
        return Response({"valid_count": len(valid), "tokens": serializer.data})


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/tokens/<token>/use/
# ─────────────────────────────────────────────────────────────────────────────

class UseReschedulingTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, token):
        try:
            token_obj = ReschedulingToken.objects.select_related(
                "original_ground"
            ).get(token=token, user=request.user)
        except ReschedulingToken.DoesNotExist:
            return Response({"detail": "Token not found."}, status=404)

        return Response({
            "valid":          token_obj.is_valid(),
            "is_used":        token_obj.is_used,
            "is_expired":     token_obj.is_expired(),
            "token":          str(token_obj.token),
            "ground_id":      token_obj.original_ground.id,
            "ground_name":    token_obj.original_ground.name,
            "original_price": str(token_obj.original_price),
            "expires_at":     token_obj.expires_at.isoformat(),
        })