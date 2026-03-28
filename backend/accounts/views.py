from decimal import Decimal

from django.db.models import Sum
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from .models import OTPVerification
from .serializers import (
    RegisterSerializer,
    VerifyOTPSerializer,
    ResendOTPSerializer,
    ProfileSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    UserListSerializer,
)
from .utils import send_otp_email

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/accounts/register/
# Creates user (unverified) and sends OTP to their email
# ─────────────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    Step 1 of registration:
      - Validate and create the user account (is_verified=False).
      - Generate a 6-digit OTP, hash it, store it.
      - Send the OTP to the user's email.

    The user CANNOT log in until they verify via OTP.
    """
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate OTP and send email
        otp_record, plain_otp = OTPVerification.create_for_user(user)
        email_sent = send_otp_email(user, plain_otp)

        return Response(
            {
                "message": (
                    "Account created. Please check your email for the 6-digit OTP "
                    "to verify your account."
                ),
                "email":       user.email,
                "email_sent":  email_sent,
                "user": {
                    "id":          user.id,
                    "email":       user.email,
                    "full_name":   user.full_name,
                    "role":        user.role,
                    "is_verified": user.is_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/accounts/verify-otp/
# Verifies the OTP entered by the user
# ─────────────────────────────────────────────────────────────────────────────

class VerifyOTPView(APIView):
    """
    Step 2 of registration:
      - Receive email + 6-digit OTP from the user.
      - Validate the OTP against the stored hash.
      - Mark user as verified on success.

    Security checks:
      - OTP must not be expired.
      - OTP must not already be used.
      - Max attempts (5) enforced to prevent brute-force.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp   = serializer.validated_data["otp"]

        # Fetch user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Already verified?
        if user.is_verified:
            return Response(
                {"detail": "This account is already verified. Please log in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch OTP record
        try:
            otp_record = OTPVerification.objects.get(user=user)
        except OTPVerification.DoesNotExist:
            return Response(
                {"detail": "No OTP found. Please register or request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guard: max attempts
        if otp_record.is_max_attempts_reached():
            return Response(
                {
                    "detail": (
                        "Too many incorrect attempts. "
                        "Please request a new OTP."
                    ),
                    "error_code": "MAX_ATTEMPTS",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Guard: already used
        if otp_record.is_used:
            return Response(
                {"detail": "This OTP has already been used. Request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guard: expired
        if otp_record.is_expired():
            return Response(
                {
                    "detail": "OTP has expired. Please request a new one.",
                    "error_code": "EXPIRED",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify OTP
        if not otp_record.verify(otp):
            attempts_left = max(
                0,
                otp_record.OTP_MAX_ATTEMPTS - otp_record.attempts
                if hasattr(otp_record, "OTP_MAX_ATTEMPTS")
                else 5 - otp_record.attempts,
            )
            return Response(
                {
                    "detail": f"Incorrect OTP. {attempts_left} attempt(s) remaining.",
                    "error_code": "WRONG_OTP",
                    "attempts_left": attempts_left,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ OTP correct — mark user as verified
        user.is_verified = True
        user.save(update_fields=["is_verified"])

        # Clean up OTP record
        otp_record.delete()

        return Response(
            {
                "message":     "Email verified successfully! You can now log in.",
                "is_verified": True,
                "email":       user.email,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/accounts/resend-otp/
# Re-sends OTP (rate-limited)
# ─────────────────────────────────────────────────────────────────────────────

class ResendOTPView(APIView):
    """
    Resend the OTP to the user's email.

    Rate limiting: minimum 60 seconds between resend requests.
    Generates a fresh OTP each time (old one is invalidated).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Security: don't reveal whether email exists
            return Response(
                {"message": "If this email is registered, a new OTP will be sent."},
                status=status.HTTP_200_OK,
            )

        if user.is_verified:
            return Response(
                {"detail": "This account is already verified. Please log in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check cooldown
        try:
            existing = OTPVerification.objects.get(user=user)
            if existing.is_on_cooldown():
                secs = existing.cooldown_seconds_left()
                return Response(
                    {
                        "detail": f"Please wait {secs} second(s) before requesting a new OTP.",
                        "error_code": "COOLDOWN",
                        "cooldown_seconds": secs,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
        except OTPVerification.DoesNotExist:
            pass  # No existing OTP — that's fine, we'll create one

        # Generate and send fresh OTP
        otp_record, plain_otp = OTPVerification.create_for_user(user)
        email_sent = send_otp_email(user, plain_otp)

        return Response(
            {
                "message":    "A new OTP has been sent to your email.",
                "email_sent": email_sent,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET / PUT / PATCH  /api/accounts/profile/
# ─────────────────────────────────────────────────────────────────────────────

class ProfileView(generics.RetrieveUpdateAPIView):
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
        return Response({"message": "Profile updated successfully.", "user": serializer.data})


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/accounts/change-password/
# ─────────────────────────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response(
            {"message": "Password changed successfully. Please log in again."}
        )


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/accounts/forgot-password/
# ─────────────────────────────────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        return Response(
            {
                "message": (
                    f"If an account with {email} exists, a password-reset "
                    "link has been sent. Please check your inbox."
                )
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/accounts/activity/
# ─────────────────────────────────────────────────────────────────────────────

class UserActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from bookings.models import Booking

        user_bookings = (
            Booking.objects.filter(user=request.user)
            .select_related("ground")
            .order_by("-created_at")
        )
        total_bookings = user_bookings.count()
        total_spent    = (
            user_bookings
            .filter(status=Booking.Status.CONFIRMED)
            .aggregate(total=Sum("total_price"))["total"]
            or Decimal("0.00")
        )
        last_booking = None
        most_recent  = user_bookings.first()
        if most_recent:
            last_booking = {
                "id":          most_recent.id,
                "ground_name": most_recent.ground.name,
                "date":        str(most_recent.date),
                "start_time":  str(most_recent.start_time),
                "end_time":    str(most_recent.end_time),
                "total_price": str(most_recent.total_price),
                "status":      most_recent.status,
            }
        return Response(
            {
                "total_bookings": total_bookings,
                "total_spent":    str(total_spent),
                "last_booking":   last_booking,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/accounts/users/   (admin only)
# ─────────────────────────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
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