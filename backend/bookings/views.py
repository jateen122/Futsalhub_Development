# backend/bookings/views.py  — REPLACE ENTIRE FILE

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Booking, LoyaltyRecord, LOYALTY_THRESHOLD
from .serializers import BookingSerializer, BookingStatusSerializer, LoyaltySerializer
from .permissions import IsPlayer, IsBookingOwner, IsOwnerOfGround


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/bookings/create/
# ─────────────────────────────────────────────────────────────────────────────

class CreateBookingView(generics.CreateAPIView):
    """
    Create a new booking.
    Auto confirms booking and updates loyalty.
    """

    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlayer]

    def perform_create(self, serializer):
        ground = serializer.validated_data.get("ground")

        if not ground.is_approved:
            raise ValidationError(
                "This ground is not yet approved and cannot be booked."
            )

        use_free = self.request.data.get("use_free_booking", False)
        is_free  = False

        if use_free:
            record = LoyaltyRecord.get_or_create_for(self.request.user, ground)
            if record.free_bookings_available <= 0:
                raise ValidationError(
                    "You have no free bookings available at this ground."
                )
            record.redeem_free_booking()
            is_free = True

        # ✅ CREATE BOOKING (AUTO CONFIRM)
        booking = serializer.save(
            user=self.request.user,
            is_free_booking=is_free,
            status="confirmed",
            **({"total_price": "0.00"} if is_free else {}),
        )

        # ✅ LOYALTY UPDATE (FIXED POSITION)
        if not booking.is_free_booking:
            record = LoyaltyRecord.get_or_create_for(self.request.user, booking.ground)
            record.record_confirmed_booking()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "message": "Booking created successfully.",
                "booking": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
    """
    Create a new booking.
    If use_free_booking=true is passed and the user has a free booking
    available at this ground, price is set to 0 and is_free_booking=True.
    """

    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlayer]

    def perform_create(self, serializer):
        ground = serializer.validated_data.get("ground")

        if not ground.is_approved:
            raise ValidationError(
                "This ground is not yet approved and cannot be booked."
            )

        use_free = self.request.data.get("use_free_booking", False)
        is_free  = False

        if use_free:
            record = LoyaltyRecord.get_or_create_for(self.request.user, ground)
            if record.free_bookings_available <= 0:
                raise ValidationError(
                    "You have no free bookings available at this ground."
                )
            record.redeem_free_booking()
            is_free = True

        serializer.save(
            user=self.request.user,
            is_free_booking=is_free,
            # override price to 0 for free bookings
            **({"total_price": "0.00"} if is_free else {}),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "message": "Booking created successfully.",
                "booking": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/bookings/<id>/cancel/
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

        if booking.status == Booking.Status.CONFIRMED:
            booking.status = Booking.Status.CANCELLED
            booking.save(update_fields=["status"])
            return Response(
                {
                    "message": "Confirmed booking cancelled. Please contact support for refund.",
                    "booking": BookingStatusSerializer(booking).data,
                }
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
# PATCH /api/bookings/<id>/update/   (Owner: confirm / cancel)
# ─────────────────────────────────────────────────────────────────────────────

class UpdateBookingStatusView(generics.UpdateAPIView):
    """
    Owner endpoint to confirm or cancel a booking.
    When a booking is CONFIRMED, the loyalty counter is incremented.
    """
    queryset           = Booking.objects.all()
    serializer_class   = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOfGround]
    http_method_names  = ["patch"]

    def get_object(self):
        booking = super().get_object()
        # Ensure this booking belongs to a ground owned by request.user
        if booking.ground.owner != self.request.user:
            raise PermissionDenied("You do not own this ground.")
        return booking

    def patch(self, request, *args, **kwargs):
        booking    = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["confirmed", "cancelled"]:
            return Response(
                {"detail": "status must be 'confirmed' or 'cancelled'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = booking.status

        booking.status = new_status
        booking.save(update_fields=["status"])

        # ── Loyalty: increment when a non-free booking is confirmed ──────────
        if new_status == "confirmed" and old_status != "confirmed":
            if not booking.is_free_booking:
                record = LoyaltyRecord.get_or_create_for(booking.user, booking.ground)
                record.record_confirmed_booking()

                # Send loyalty notification if a free booking was just earned
                if record.free_bookings_available > 0 and record.confirmed_count % LOYALTY_THRESHOLD == 0:
                    try:
                        from notifications.models import Notification
                        Notification.send(
                            user=booking.user,
                            message=(
                                f"🎉 You've earned a FREE booking at '{booking.ground.name}'! "
                                f"You've confirmed {record.confirmed_count} bookings there. "
                                f"Use your free booking on your next visit!"
                            ),
                            notification_type=Notification.Type.GENERAL,
                        )
                    except Exception:
                        pass

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

        ground_id     = self.request.query_params.get("ground_id")
        status_filter = self.request.query_params.get("status")
        date_filter   = self.request.query_params.get("date")

        if ground_id:
            qs = qs.filter(ground__id=ground_id)
        if status_filter:
            qs = qs.filter(status=status_filter.lower())
        if date_filter:
            qs = qs.filter(date=date_filter)

        return qs


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/bookings/loyalty/              — all loyalty records for the user
# GET /api/bookings/loyalty/<ground_id>/  — specific ground loyalty status
# ─────────────────────────────────────────────────────────────────────────────

class UserLoyaltyView(generics.ListAPIView):
    """
    Returns all loyalty records for the authenticated user,
    one per ground they have bookings at.
    """
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


class GroundLoyaltyView(APIView):
    """
    GET /api/bookings/loyalty/<ground_id>/
    Returns the loyalty status for a specific ground for the logged-in user.
    Used in the booking modal to show progress and free-booking option.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, ground_id):
        try:
            from grounds.models import Ground
            ground = Ground.objects.get(pk=ground_id)
        except Exception:
            return Response({"detail": "Ground not found."}, status=404)

        record = LoyaltyRecord.get_or_create_for(request.user, ground)

        return Response({
            "ground_id":               ground.id,
            "ground_name":             ground.name,
            "confirmed_count":         record.confirmed_count,
            "free_bookings_earned":    record.free_bookings_earned,
            "free_bookings_used":      record.free_bookings_used,
            "free_bookings_available": record.free_bookings_available,
            "bookings_until_next_free": record.bookings_until_next_free,
            "progress_to_next_free":   record.progress_to_next_free,
            "loyalty_threshold":       LOYALTY_THRESHOLD,
        })