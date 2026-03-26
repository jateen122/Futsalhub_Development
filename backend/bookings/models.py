# backend/bookings/models.py  — REPLACE ENTIRE FILE

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

LOYALTY_THRESHOLD = 5   # confirm this many bookings → earn 1 free


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
    created_at  = models.DateTimeField(auto_now_add=True)

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
            ground      = self.ground,
            date        = self.date,
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

    # ── Computed helpers ──────────────────────────────────────────────────────

    @property
    def free_bookings_available(self):
        """Free bookings earned but not yet used."""
        return max(0, self.free_bookings_earned - self.free_bookings_used)

    @property
    def bookings_until_next_free(self):
        """How many more confirmed bookings until the next free one."""
        remainder = self.confirmed_count % LOYALTY_THRESHOLD
        return LOYALTY_THRESHOLD - remainder if remainder != 0 else LOYALTY_THRESHOLD

    @property
    def progress_to_next_free(self):
        """0-100 percentage progress toward the next free booking."""
        remainder = self.confirmed_count % LOYALTY_THRESHOLD
        return int((remainder / LOYALTY_THRESHOLD) * 100)

    # ── Mutation methods ──────────────────────────────────────────────────────

    def record_confirmed_booking(self):
        """
        Call this when a non-free booking is CONFIRMED.
        Increments counter and awards a free booking every LOYALTY_THRESHOLD.
        """
        self.confirmed_count += 1
        new_earned = self.confirmed_count // LOYALTY_THRESHOLD
        if new_earned > self.free_bookings_earned:
            self.free_bookings_earned = new_earned
        self.save(update_fields=["confirmed_count", "free_bookings_earned", "updated_at"])

    def redeem_free_booking(self):
        """
        Call when a user redeems a free booking.
        Returns True if successful, False if no free bookings available.
        """
        if self.free_bookings_available <= 0:
            return False
        self.free_bookings_used += 1
        self.save(update_fields=["free_bookings_used", "updated_at"])
        return True

    @classmethod
    def get_or_create_for(cls, user, ground):
        """Convenience: get or create the record for a user-ground pair."""
        record, _ = cls.objects.get_or_create(user=user, ground=ground)
        return record