from django.urls import path
from .views import (
    RegisterView,
    ProfileView,
    ChangePasswordView,
    ForgotPasswordView,
    UserActivityView,
    AdminUserListView,
)

app_name = "accounts"

urlpatterns = [
    # ── Public ───────────────────────────────────────────────────────────────
    path("register/",        RegisterView.as_view(),        name="register"),
    path("forgot-password/", ForgotPasswordView.as_view(),  name="forgot-password"),

    # ── Authenticated user ────────────────────────────────────────────────────
    path("profile/",         ProfileView.as_view(),         name="profile"),
    path("change-password/", ChangePasswordView.as_view(),  name="change-password"),
    path("activity/",        UserActivityView.as_view(),    name="activity"),

    # ── Admin only ────────────────────────────────────────────────────────────
    path("users/",           AdminUserListView.as_view(),   name="user-list"),
]
