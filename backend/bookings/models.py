# backend/bookings/models.py

import uuid
from datetime import timedelta

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

LOYALTY_THRESHOLD = 5       # confirm this many bookings → earn 1 free
CANCEL_WINDOW_HOURS = 4     # must cancel at least this many hours before slot
TOKEN_EXPIRY_DAYS = 30      # rescheduling token valid for 30 days


class Booking(models.Model):

    class Status(models.TextChoices):
        PENDING   = "pending",   "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED  = "refunded",  "Refunded"

    user   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    ground = models.ForeignKey(
        "grounds.Ground",
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    date        = models.DateField()
    start_time  = models.TimeField()
    end_time    = models.TimeField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status      = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
    )
    is_free_booking = models.BooleanField(
        default=False,
        verbose_name="Free Booking",
        help_text="True if this booking was redeemed as a loyalty free booking.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Booking"
        verbose_name_plural = "Bookings"

    def __str__(self):
        free_tag = " [FREE]" if self.is_free_booking else ""
        return (
            f"{self.user.email} → {self.ground.name} "
            f"on {self.date} ({self.start_time}–{self.end_time}) [{self.status}]{free_tag}"
        )

    # ── Overlap validation ────────────────────────────────────────────────────

    def clean(self):
        if not self.start_time or not self.end_time:
            return

        if self.start_time >= self.end_time:
            raise ValidationError(
                {"end_time": "End time must be after start time."}
            )

        conflicts = Booking.objects.filter(
            ground         = self.ground,
            date           = self.date,
            start_time__lt = self.end_time,
            end_time__gt   = self.start_time,
        ).exclude(
            status__in = [self.Status.CANCELLED, self.Status.REFUNDED]
        )

        if self.pk:
            conflicts = conflicts.exclude(pk=self.pk)

        if conflicts.exists():
            raise ValidationError(
                "This ground is already booked for the selected time slot. "
                "Please choose a different time."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    # ── Cancellation helpers ──────────────────────────────────────────────────

    def can_cancel_with_token(self):
        """
        Returns True if the booking can still be cancelled with a rescheduling token.
        Requires at least CANCEL_WINDOW_HOURS before the slot start.
        """
        from datetime import datetime, date
        slot_datetime = timezone.make_aware(
            datetime.combine(self.date, self.start_time)
        )
        return timezone.now() <= slot_datetime - timedelta(hours=CANCEL_WINDOW_HOURS)

    def hours_until_slot(self):
        """Returns how many hours until the booking slot starts."""
        from datetime import datetime
        slot_datetime = timezone.make_aware(
            datetime.combine(self.date, self.start_time)
        )
        delta = slot_datetime - timezone.now()
        return delta.total_seconds() / 3600


class LoyaltyRecord(models.Model):
    """
    Tracks how many confirmed bookings a user has at a specific ground.
    Every LOYALTY_THRESHOLD confirmed bookings earns 1 free booking.
    """
    user   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="loyalty_records",
    )
    ground = models.ForeignKey(
        "grounds.Ground",
        on_delete=models.CASCADE,
        related_name="loyalty_records",
    )
    confirmed_count      = models.PositiveIntegerField(
        default=0,
        help_text="Number of confirmed (non-free) bookings by this user at this ground.",
    )
    free_bookings_earned = models.PositiveIntegerField(
        default=0,
        help_text="Total free bookings earned (every 5 confirmed bookings).",
    )
    free_bookings_used   = models.PositiveIntegerField(
        default=0,
        help_text="Free bookings already redeemed.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together     = ("user", "ground")
        ordering            = ["-updated_at"]
        verbose_name        = "Loyalty Record"
        verbose_name_plural = "Loyalty Records"

    def __str__(self):
        return f"{self.user.email} @ {self.ground.name} — {self.confirmed_count} bookings"

    @property
    def free_bookings_available(self):
        return max(0, self.free_bookings_earned - self.free_bookings_used)

    @property
    def bookings_until_next_free(self):
        remainder = self.confirmed_count % LOYALTY_THRESHOLD
        return LOYALTY_THRESHOLD - remainder if remainder != 0 else LOYALTY_THRESHOLD

    @property
    def progress_to_next_free(self):
        remainder = self.confirmed_count % LOYALTY_THRESHOLD
        return int((remainder / LOYALTY_THRESHOLD) * 100)

    def record_confirmed_booking(self):
        self.confirmed_count += 1
        new_earned = self.confirmed_count // LOYALTY_THRESHOLD
        if new_earned > self.free_bookings_earned:
            self.free_bookings_earned = new_earned
        self.save(update_fields=["confirmed_count", "free_bookings_earned", "updated_at"])

    def redeem_free_booking(self):
        if self.free_bookings_available <= 0:
            return False
        self.free_bookings_used += 1
        self.save(update_fields=["free_bookings_used", "updated_at"])
        return True

    @classmethod
    def get_or_create_for(cls, user, ground):
        record, _ = cls.objects.get_or_create(user=user, ground=ground)
        return record


class ReschedulingToken(models.Model):
    """
    Issued when a player cancels a confirmed booking at least CANCEL_WINDOW_HOURS
    before the slot. The token holds the monetary value of the original booking
    and can be redeemed for a new booking at the SAME ground within TOKEN_EXPIRY_DAYS.
    """
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rescheduling_tokens",
    )
    original_ground = models.ForeignKey(
        "grounds.Ground",
        on_delete=models.CASCADE,
        related_name="rescheduling_tokens",
        verbose_name="Original Ground",
    )
    original_date       = models.DateField()
    original_start_time = models.TimeField()
    original_end_time   = models.TimeField()
    original_price      = models.DecimalField(max_digits=10, decimal_places=2)
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Rescheduling Token"
        verbose_name_plural = "Rescheduling Tokens"

    def __str__(self):
        status = "USED" if self.is_used else ("EXPIRED" if self.is_expired() else "VALID")
        return (
            f"Token {str(self.token)[:8]}… | {self.user.email} | "
            f"{self.original_ground.name} | Rs {self.original_price} | [{status}]"
        )

    def is_expired(self):
        return timezone.now() > self.expires_at

    def is_valid(self):
        return not self.is_used and not self.is_expired()

    @classmethod
    def create_for_booking(cls, booking):
        """
        Create a rescheduling token for a cancelled confirmed booking.
        Returns the token instance.
        """
        expires_at = timezone.now() + timedelta(days=TOKEN_EXPIRY_DAYS)
        return cls.objects.create(
            user                = booking.user,
            original_ground     = booking.ground,
            original_date       = booking.date,
            original_start_time = booking.start_time,
            original_end_time   = booking.end_time,
            original_price      = booking.total_price,
            expires_at          = expires_at,
        )

    def redeem(self):
        """Mark this token as used. Returns True on success."""
        if not self.is_valid():
            return False
        self.is_used = True
        self.save(update_fields=["is_used"])
        return True