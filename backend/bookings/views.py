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
    """
    Creates exactly ONE booking per request.
    Paid bookings → status=pending
    Free bookings  → status=confirmed  (loyalty reward)

    BUG FIX: Removed the duplicate record.record_confirmed_booking() call
    that was firing after serializer.save(), which caused an extra loyalty
    count increment — and because of how full_clean() interacts with the
    overlap validator, it was also manifesting as ghost slot reservations.
    The loyalty count is now recorded in ONE place only:
      - Free bookings: recorded inside redeem_free_booking()
      - Paid bookings: recorded inside UpdateBookingStatusView when owner confirms
    """
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlayer]

    def perform_create(self, serializer):
        ground = serializer.validated_data.get("ground")

        if not ground.is_approved:
            raise ValidationError("This ground is not yet approved and cannot be booked.")

        is_free = bool(self.request.data.get("is_free_booking", False))

        if is_free:
            # Validate free booking availability BEFORE saving anything
            record = LoyaltyRecord.get_or_create_for(self.request.user, ground)
            if record.free_bookings_available <= 0:
                raise ValidationError("No free bookings available for this ground.")

            # Redeem the free booking (decrements free_bookings_available)
            record.redeem_free_booking()

            # Save the booking with free price and auto-confirmed status
            # Pass only valid model fields — do NOT pass is_free_booking as kwarg
            # because BookingSerializer will handle it via the model field
            booking = serializer.save(
                user=self.request.user,
                status=Booking.Status.CONFIRMED,
                total_price="0.00",
                is_free_booking=True,
            )
        else:
            # Normal paid booking — status stays pending until owner confirms
            # DO NOT call record_confirmed_booking() here.
            # It is called in UpdateBookingStatusView when owner sets status=confirmed
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
    """
    Owner-only endpoint to confirm or cancel a booking.

    When a PAID booking is confirmed here, loyalty is recorded ONCE.
    Free bookings skip loyalty recording (already handled at creation).
    """
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

        # Record loyalty ONLY when:
        #   1. Status changed TO confirmed (not already confirmed)
        #   2. It is NOT a free booking (free bookings don't earn loyalty points)
        if (
            new_status == "confirmed"
            and old_status != "confirmed"
            and not booking.is_free_booking
        ):
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
    """
    Returns all loyalty records for the logged-in player.
    Shows progress toward free bookings for each ground they've booked.
    """
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
    """
    Returns loyalty status for the current user at a specific ground.
    Used by the booking modal to show progress bar and free booking option.
    """
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
# GET /api/bookings/<ground_id>/booked-slots/
# ─────────────────────────────────────────────────────────────────────────────
class GroundBookedSlotsView(APIView):
    """
    Returns booked time slots for a ground on a specific date.
    Used by the frontend slot picker to grey out unavailable hours.
    Only returns active bookings (excludes cancelled/refunded).
    """
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