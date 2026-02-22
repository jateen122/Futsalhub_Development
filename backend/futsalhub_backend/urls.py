"""
futsalhub_backend — root URL configuration
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # ── Django admin ──────────────────────────────────────────────────────────
    path("admin/", admin.site.urls),

    # ── JWT token endpoints ───────────────────────────────────────────────────
    # POST  /api/token/         → obtain access + refresh tokens (login)
    # POST  /api/token/refresh/ → get a new access token via refresh token
    # POST  /api/token/verify/  → check whether a token is still valid
    path("api/token/",         TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(),    name="token_refresh"),
    path("api/token/verify/",  TokenVerifyView.as_view(),     name="token_verify"),

    # ── App routes ────────────────────────────────────────────────────────────
    path("api/accounts/",      include("accounts.urls",      namespace="accounts")),
    #path("api/grounds/",       include("grounds.urls")),
    #path("api/bookings/",      include("bookings.urls")),
    #path("api/payments/",      include("payments.urls")),
    #path("api/notifications/", include("notifications.urls")),
]

# Serve uploaded media & static files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
