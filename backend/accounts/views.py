from decimal import Decimal

from django.db.models import Sum
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    UserListSerializer,
)

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/accounts/register/
# ─────────────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    Public endpoint — no authentication required.

    Creates a new user account.
    - PLAYER accounts are automatically verified (is_verified=True).
    - OWNER  accounts require manual admin verification (is_verified=False).
    """

    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "message": "Account created successfully.",
                "user": {
                    "id"         : user.id,
                    "email"      : user.email,
                    "full_name"  : user.full_name,
                    "role"       : user.role,
                    "is_verified": user.is_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET / PUT / PATCH  /api/accounts/profile/
# ─────────────────────────────────────────────────────────────────────────────

class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   -> retrieve authenticated user's profile
    PUT   -> full update  (multipart/form-data supported for image upload)
    PATCH -> partial update

    Writable : full_name, phone, city, profile_image
    Read-only: id, email, role, is_verified, is_active, created_at
    """

    serializer_class   = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop("partial", False)
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {
                "message": "Profile updated successfully.",
                "user"   : serializer.data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/accounts/change-password/
# ─────────────────────────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    Allows an authenticated user to change their own password.

    Body:
        old_password  -- must match the current password
        new_password  -- validated against Django's password validators;
                         must differ from old_password
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully. Please log in again."},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/accounts/forgot-password/
# ─────────────────────────────────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    """
    Simulated password-reset endpoint.

    Accepts an email address and always returns a success response so as
    not to reveal whether an account with that email exists.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        return Response(
            {
                "message": (
                    f"If an account with {email} exists, a password-reset "
                    "link has been sent. Please check your inbox."
                )
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/accounts/activity/
# ─────────────────────────────────────────────────────────────────────────────

class UserActivityView(APIView):
    """
    Returns a summary of the authenticated user's platform activity.

    Response:
        total_bookings  -- count of all bookings made by this user
        total_spent     -- sum of confirmed booking amounts (as string)
        last_booking    -- details of the most recent booking, or null
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Import here to avoid circular dependency (accounts <-> bookings)
        from bookings.models import Booking

        user_bookings = (
            Booking.objects
            .filter(user=request.user)
            .select_related("ground")
            .order_by("-created_at")
        )

        total_bookings = user_bookings.count()

        total_spent = (
            user_bookings
            .filter(status=Booking.Status.CONFIRMED)
            .aggregate(total=Sum("total_price"))["total"]
            or Decimal("0.00")
        )

        last_booking = None
        most_recent  = user_bookings.first()
        if most_recent:
            last_booking = {
                "id"         : most_recent.id,
                "ground_name": most_recent.ground.name,
                "date"       : str(most_recent.date),
                "start_time" : str(most_recent.start_time),
                "end_time"   : str(most_recent.end_time),
                "total_price": str(most_recent.total_price),
                "status"     : most_recent.status,
            }

        return Response(
            {
                "total_bookings": total_bookings,
                "total_spent"   : str(total_spent),
                "last_booking"  : last_booking,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/accounts/users/   (admin only)
# ─────────────────────────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """
    Admin-only endpoint that returns all registered users.
    Supports optional ?role=player|owner|admin query param.
    """

    serializer_class   = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != "admin":
            raise PermissionDenied("Only admin users can access this endpoint.")

        qs          = User.objects.all()
        role_filter = self.request.query_params.get("role")
        if role_filter:
            qs = qs.filter(role=role_filter.lower())
        return qs
