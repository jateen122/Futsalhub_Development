# backend/bookings/urls.py  — REPLACE ENTIRE FILE

from django.urls import path
from .views import (
    CreateBookingView,
    CancelBookingView,
    UserBookingsView,
    OwnerBookingsView,
    UpdateBookingStatusView,
    UserLoyaltyView,
    GroundLoyaltyView,
)

app_name = "bookings"

urlpatterns = [
    # Player — create a booking (pass use_free_booking=true to redeem free)
    path("create/",                    CreateBookingView.as_view(),       name="booking-create"),

    # Player — cancel their own booking
    path("<int:pk>/cancel/",           CancelBookingView.as_view(),       name="booking-cancel"),

    # Owner — confirm or cancel a booking
    path("<int:pk>/update/",           UpdateBookingStatusView.as_view(), name="booking-update"),

    # Player — view their own bookings
    path("my/",                        UserBookingsView.as_view(),        name="booking-my-list"),

    # Owner — view bookings for their grounds
    path("owner/",                     OwnerBookingsView.as_view(),       name="booking-owner-list"),

    # Loyalty — all grounds loyalty status for logged-in player
    path("loyalty/",                   UserLoyaltyView.as_view(),         name="loyalty-list"),

    # Loyalty — specific ground loyalty status
    path("loyalty/<int:ground_id>/",   GroundLoyaltyView.as_view(),       name="loyalty-ground"),
]