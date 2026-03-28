from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)

# Use our custom view that blocks unverified users from logging in
from futsalhub_backend.token_views import EmailVerifiedTokenObtainPairView

urlpatterns = [
    path("admin/",              admin.site.urls),

    # JWT — uses EmailVerifiedTokenObtainPairView instead of the default
    # This blocks login if the user has not verified their email via OTP
    path("api/token/",          EmailVerifiedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/",  TokenRefreshView.as_view(),                 name="token_refresh"),
    path("api/token/verify/",   TokenVerifyView.as_view(),                  name="token_verify"),

    # App routes
    path("api/accounts/",       include("accounts.urls")),
    path("api/grounds/",        include("grounds.urls")),
    path("api/bookings/",       include("bookings.urls")),
    path("api/payments/",       include("payments.urls")),
    path("api/notifications/",  include("notifications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,  document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)