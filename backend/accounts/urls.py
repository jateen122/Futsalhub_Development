from django.urls import path
from .views import (
    RegisterView,
    VerifyOTPView,
    ResendOTPView,
    ProfileView,
    ChangePasswordView,
    ForgotPasswordView,
    UserActivityView,
    AdminUserListView,
)

app_name = "accounts"

urlpatterns = [
    # ── Registration + OTP verification ───────────────────────────────────────
    path("register/",      RegisterView.as_view(),    name="register"),
    path("verify-otp/",    VerifyOTPView.as_view(),   name="verify-otp"),
    path("resend-otp/",    ResendOTPView.as_view(),   name="resend-otp"),

    # ── Authenticated user ────────────────────────────────────────────────────
    path("profile/",         ProfileView.as_view(),         name="profile"),
    path("change-password/", ChangePasswordView.as_view(),  name="change-password"),
    path("activity/",        UserActivityView.as_view(),    name="activity"),

    # ── Simulated forgot password ─────────────────────────────────────────────
    path("forgot-password/", ForgotPasswordView.as_view(),  name="forgot-password"),

    # ── Admin only ────────────────────────────────────────────────────────────
    path("users/",           AdminUserListView.as_view(),   name="user-list"),
]