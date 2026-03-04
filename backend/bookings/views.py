from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Booking
from .serializers import BookingSerializer, BookingStatusSerializer
from .permissions import IsPlayer, IsBookingOwner, IsOwnerOfGround


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/bookings/create/
# ─────────────────────────────────────────────────────────────────────────────

class CreateBookingView(generics.CreateAPIView):
    """
    Create a new booking.

    Access   : Authenticated users with role='player' only.
    Behavior :
      • request.user is automatically set as the booking user.
      • total_price is calculated automatically (price_per_hour × duration).
      • Overlap validation runs inside Booking.clean() on save.
      • Ground must be approved before it can be booked.
    """

    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlayer]

    def perform_create(self, serializer):
        ground = serializer.validated_data.get("ground")

        # Guard: ground must be approved by admin
        if not ground.is_approved:
            raise ValidationError(
                "This ground is not yet approved and cannot be booked."
            )

        serializer.save(user=self.request.user)

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
    """
    Cancel an existing booking.

    Access   : Only the player who made the booking.
    Behavior :
      • Sets status to CANCELLED.
      • Cannot cancel an already cancelled or refunded booking.
      • Only PATCH is allowed (not PUT).
    """

    queryset           = Booking.objects.all()
    serializer_class   = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsBookingOwner]
    http_method_names  = ["patch"]

    def patch(self, request, *args, **kwargs):
        booking = self.get_object()   # triggers has_object_permission

        if booking.status in [Booking.Status.CANCELLED, Booking.Status.REFUNDED]:
            return Response(
                {"detail": f"Booking is already {booking.status} and cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.status == Booking.Status.CONFIRMED:
            # Allow cancel but flag it for potential refund processing
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
# GET /api/bookings/my/
# ─────────────────────────────────────────────────────────────────────────────

class UserBookingsView(generics.ListAPIView):
    """
    List all bookings made by the currently authenticated player.

    Access   : Any authenticated user.
    Filtering: Optional ?status=pending|confirmed|cancelled|refunded
    """

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
    """
    List all bookings for grounds owned by the authenticated owner.

    Access   : Authenticated users with role='owner'.
    Filtering: Optional ?ground_id=<id>  ?status=<status>  ?date=YYYY-MM-DD
    """

    serializer_class   = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOfGround]

    def get_queryset(self):
        # Only return bookings for grounds this owner owns
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
