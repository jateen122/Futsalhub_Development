# backend/bookings/urls.py
from django.urls import path
from .views import (
    CreateBookingView,
    CancelBookingView,
    UserBookingsView,
    OwnerBookingsView,
    UpdateBookingStatusView,
    UserLoyaltyView,
    GroundLoyaltyView,
    GroundBookedSlotsView,
    # Rescheduling token views
    UserReschedulingTokensView,
    UseReschedulingTokenView,
)

app_name = "bookings"

urlpatterns = [
    # Player — create a booking (paid or free)
    path("create/", CreateBookingView.as_view(), name="booking-create"),

    # Player — cancel their own booking
    path("<int:pk>/cancel/", CancelBookingView.as_view(), name="booking-cancel"),

    # Owner — confirm or cancel a booking
    path("<int:pk>/update/", UpdateBookingStatusView.as_view(), name="booking-update"),

    # Player — view their own bookings
    path("my/", UserBookingsView.as_view(), name="booking-my-list"),

    # Owner — view bookings for their grounds
    path("owner/", OwnerBookingsView.as_view(), name="booking-owner-list"),

    # Loyalty — all grounds loyalty status for logged-in player
    path("loyalty/", UserLoyaltyView.as_view(), name="loyalty-list"),

    # Loyalty — specific ground loyalty status
    path("loyalty/<int:ground_id>/", GroundLoyaltyView.as_view(), name="loyalty-ground"),

    # Booked slots for a specific ground on a specific date
    path("ground/<int:ground_id>/booked-slots/", GroundBookedSlotsView.as_view(), name="ground-booked-slots"),

    # Rescheduling tokens
    path("tokens/",            UserReschedulingTokensView.as_view(), name="token-list"),
    path("tokens/<uuid:token>/use/", UseReschedulingTokenView.as_view(),  name="token-use"),
]