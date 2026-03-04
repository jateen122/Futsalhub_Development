from django.urls import path
from .views import (
    CreateBookingView,
    CancelBookingView,
    UserBookingsView,
    OwnerBookingsView,
)

app_name = "bookings"

urlpatterns = [
    # Player — create a booking
    path("create/",            CreateBookingView.as_view(),  name="booking-create"),

    # Player — cancel their own booking
    path("<int:pk>/cancel/",   CancelBookingView.as_view(),  name="booking-cancel"),

    # Player — view their own bookings
    path("my/",                UserBookingsView.as_view(),   name="booking-my-list"),

    # Owner — view bookings for their grounds
    path("owner/",             OwnerBookingsView.as_view(),  name="booking-owner-list"),
]
