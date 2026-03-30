from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import Booking, LoyaltyRecord, LOYALTY_THRESHOLD
from .serializers import BookingSerializer, BookingStatusSerializer, LoyaltySerializer
from .permissions import IsPlayer, IsBookingOwner, IsOwnerOfGround


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/bookings/create/
# ─────────────────────────────────────────────────────────────────────────────
class CreateBookingView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlayer]

    def perform_create(self, serializer):
        ground = serializer.validated_data.get("ground")

        if not ground.is_approved:
            raise ValidationError("This ground is not yet approved and cannot be booked.")

        is_free = bool(self.request.data.get("is_free_booking", False))

        if is_free:
            record = LoyaltyRecord.get_or_create_for(self.request.user, ground)
            if record.free_bookings_available <= 0:
                raise ValidationError("No free bookings available for this ground.")

            # Redeem the free booking credit
            record.redeem_free_booking()

            # Now create as PENDING (same as normal bookings)
            booking = serializer.save(
                user=self.request.user,
                status=Booking.Status.PENDING,        # ← CHANGED HERE
                total_price="0.00",
                is_free_booking=True,
            )
        else:
            booking = serializer.save(
                user=self.request.user,
                status=Booking.Status.PENDING,
                is_free_booking=False,
            )

        return booking

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = self.perform_create(serializer)

        return Response(
            {
                "message": "Booking created successfully.",
                "booking": BookingSerializer(booking).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/bookings/<id>/cancel/
# ─────────────────────────────────────────────────────────────────────────────
class CancelBookingView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsBookingOwner]
    http_method_names = ["patch"]

    def patch(self, request, *args, **kwargs):
        booking = self.get_object()

        if booking.status in [Booking.Status.CANCELLED, Booking.Status.REFUNDED]:
            return Response(
                {"detail": f"Booking is already {booking.status} and cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status"])

        return Response(
            {
                "message": "Booking cancelled successfully.",
                "booking": BookingStatusSerializer(booking).data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/bookings/<id>/update/   (owner confirms or cancels)
# ─────────────────────────────────────────────────────────────────────────────
class UpdateBookingStatusView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOfGround]
    http_method_names = ["patch"]

    def get_object(self):
        booking = super().get_object()
        if booking.ground.owner != self.request.user:
            raise PermissionDenied("You do not own the ground this booking is for.")
        return booking

    def patch(self, request, *args, **kwargs):
        booking = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["confirmed", "cancelled"]:
            return Response(
                {"detail": "Status must be 'confirmed' or 'cancelled'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = booking.status
        booking.status = new_status
        booking.save(update_fields=["status"])

        if (
            new_status == "confirmed"
            and old_status != "confirmed"
            and not booking.is_free_booking
        ):
            khalti_already_paid = booking.payments.filter(
                status="success",
                payment_method="khalti",
            ).exists()

            if not khalti_already_paid:
                record = LoyaltyRecord.get_or_create_for(booking.user, booking.ground)
                record.record_confirmed_booking()

        return Response(
            {
                "message": f"Booking {new_status}.",
                "booking": BookingStatusSerializer(booking).data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/my/
# ─────────────────────────────────────────────────────────────────────────────
class UserBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
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
    serializer_class = BookingSerializer
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
    serializer_class = LoyaltySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            LoyaltyRecord.objects
            .filter(user=self.request.user)
            .select_related("ground", "ground__owner")
            .order_by("-updated_at")
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        total_free = sum(r.free_bookings_available for r in qs)
        return Response(
            {
                "total_free_available": total_free,
                "loyalty_records": serializer.data,
            }
        )


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
        return Response(
            {
                "ground_id": ground.id,
                "ground_name": ground.name,
                "confirmed_count": record.confirmed_count,
                "free_bookings_earned": record.free_bookings_earned,
                "free_bookings_used": record.free_bookings_used,
                "free_bookings_available": record.free_bookings_available,
                "bookings_until_next_free": record.bookings_until_next_free,
                "progress_to_next_free": record.progress_to_next_free,
                "loyalty_threshold": LOYALTY_THRESHOLD,
            }
        )


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