"""
Notification Signals
────────────────────
Automatically fires notifications when booking events occur.

Triggers:
  1. Booking CREATED   → notify the ground owner
  2. Booking CONFIRMED → notify the player
  3. Booking CANCELLED → notify the player

Django signals listen to Booking post_save events and create
Notification records without any manual view-level code.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


# Import lazily inside handlers to avoid circular imports
# (bookings → notifications → bookings would be circular at module level)


@receiver(post_save, sender="bookings.Booking")
def handle_booking_notifications(sender, instance, created, **kwargs):
    """
    Single signal handler for all booking lifecycle notifications.

    - On CREATE : notify ground owner about new booking.
    - On UPDATE : notify player if status changed to CONFIRMED or CANCELLED.
    """
    from notifications.models import Notification

    booking = instance

    # ── 1. New booking created ────────────────────────────────────────────────
    if created:
        Notification.send(
            user              = booking.ground.owner,
            message           = (
                f"New booking received for your ground '{booking.ground.name}' "
                f"on {booking.date} from {booking.start_time.strftime('%I:%M %p')} "
                f"to {booking.end_time.strftime('%I:%M %p')}."
            ),
            notification_type = Notification.Type.BOOKING_RECEIVED,
        )
        return   # skip status-change checks on creation

    # ── 2. Booking status changed ─────────────────────────────────────────────
    # Fetch the previous state from DB to detect what changed
    try:
        previous = sender.objects.get(pk=booking.pk)
    except sender.DoesNotExist:
        return

    # We compare using the value stored in DB before this save.
    # Because post_save fires after the save, we check update_fields
    # or re-query — here we rely on the fact that signals pass the
    # fully updated instance, so we track the status on the instance.
    # For reliable "previous status" detection we use a pre_save companion.
    # See _capture_previous_status below for the pre_save hook.

    previous_status = getattr(booking, "_previous_status", None)
    current_status  = booking.status

    if previous_status == current_status:
        return   # status did not change — nothing to notify

    # ── 2a. Confirmed ──────────────────────────────────────────────────────────
    if current_status == "confirmed":
        Notification.send(
            user              = booking.user,
            message           = (
                f"Your booking for '{booking.ground.name}' on {booking.date} "
                f"({booking.start_time.strftime('%I:%M %p')} – "
                f"{booking.end_time.strftime('%I:%M %p')}) has been confirmed."
            ),
            notification_type = Notification.Type.BOOKING_CONFIRMED,
        )

    # ── 2b. Cancelled ─────────────────────────────────────────────────────────
    elif current_status == "cancelled":
        Notification.send(
            user              = booking.user,
            message           = (
                f"Your booking for '{booking.ground.name}' on {booking.date} "
                f"({booking.start_time.strftime('%I:%M %p')} – "
                f"{booking.end_time.strftime('%I:%M %p')}) has been cancelled."
            ),
            notification_type = Notification.Type.BOOKING_CANCELLED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Pre-save hook — capture previous status BEFORE the save happens
# so post_save can compare old vs new status reliably.
# ─────────────────────────────────────────────────────────────────────────────

from django.db.models.signals import pre_save

@receiver(pre_save, sender="bookings.Booking")
def capture_previous_status(sender, instance, **kwargs):
    """
    Before saving a Booking, fetch its current DB state and
    attach it as _previous_status on the instance.

    This gives the post_save handler a reliable way to detect
    whether the status actually changed.
    """
    if instance.pk:
        try:
            previous = sender.objects.get(pk=instance.pk)
            instance._previous_status = previous.status
        except sender.DoesNotExist:
            instance._previous_status = None
    else:
        # New object — no previous status
        instance._previous_status = None
