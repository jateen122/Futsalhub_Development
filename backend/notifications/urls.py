from django.urls import path
from .views import (
    UserNotificationsView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
)

app_name = "notifications"

urlpatterns = [
    # List all notifications for logged-in user
    path("",                  UserNotificationsView.as_view(),      name="notification-list"),

    # Mark all as read in one shot
    path("read-all/",         MarkAllNotificationsReadView.as_view(), name="notification-read-all"),

    # Mark a single notification as read
    path("<int:pk>/read/",    MarkNotificationReadView.as_view(),   name="notification-read"),
]
