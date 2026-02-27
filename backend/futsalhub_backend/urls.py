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
    # ---------------- ADMIN ----------------
    path("admin/", admin.site.urls),

    # ---------------- JWT AUTH ----------------
    path("api/token/",         TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(),    name="token_refresh"),
    path("api/token/verify/",  TokenVerifyView.as_view(),     name="token_verify"),

    # ---------------- APP ROUTES ----------------
    path("api/accounts/", include("accounts.urls")),
    path("api/grounds/",  include("grounds.urls")),
    #path("api/bookings/", include("bookings.urls")),
    #path("api/payments/", include("payments.urls")),
    #path("api/notifications/", include("notifications.urls")),
]

# ---------------- SERVE MEDIA FILES IN DEVELOPMENT ----------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)