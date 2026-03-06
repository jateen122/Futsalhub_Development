from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    A single in-app notification for a user.

    Notifications are created automatically via Django signals
    when key booking events occur (created, confirmed, cancelled).
    """

    class Type(models.TextChoices):
        BOOKING_RECEIVED  = "booking_received",  "Booking Received"
        BOOKING_CONFIRMED = "booking_confirmed",  "Booking Confirmed"
        BOOKING_CANCELLED = "booking_cancelled",  "Booking Cancelled"
        GENERAL           = "general",            "General"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=Type.choices,
        default=Type.GENERAL,
    )
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        status = "READ" if self.is_read else "UNREAD"
        return f"[{status}] {self.user.email} — {self.notification_type}"

    @classmethod
    def send(cls, user, message, notification_type="general"):
        """
        Convenience factory method to create a notification in one line.

        Usage:
            Notification.send(owner, "New booking received.", "booking_received")
        """
        return cls.objects.create(
            user              = user,
            message           = message,
            notification_type = notification_type,
        )
