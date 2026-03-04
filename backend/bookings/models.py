from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


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
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Booking"
        verbose_name_plural = "Bookings"

    def __str__(self):
        return (
            f"{self.user.email} → {self.ground.name} "
            f"on {self.date} ({self.start_time}–{self.end_time}) [{self.status}]"
        )

    # ── Overlap validation ────────────────────────────────────────────────────

    def clean(self):
        """
        Prevent double-booking for the same ground on the same date.

        Overlap condition (Allen's interval logic):
            new.start_time < existing.end_time
            AND
            new.end_time   > existing.start_time

        This catches all cases: full overlap, partial overlap, and
        one booking containing another.
        """
        if not self.start_time or not self.end_time:
            return

        if self.start_time >= self.end_time:
            raise ValidationError(
                {"end_time": "End time must be after start time."}
            )

        # Build conflict queryset
        conflicts = Booking.objects.filter(
            ground      = self.ground,
            date        = self.date,
            start_time__lt = self.end_time,
            end_time__gt   = self.start_time,
        ).exclude(
            status__in = [self.Status.CANCELLED, self.Status.REFUNDED]
        )

        # Exclude self when updating an existing booking
        if self.pk:
            conflicts = conflicts.exclude(pk=self.pk)

        if conflicts.exists():
            raise ValidationError(
                "This ground is already booked for the selected time slot. "
                "Please choose a different time."
            )

    def save(self, *args, **kwargs):
        self.full_clean()          # always run clean() before saving
        super().save(*args, **kwargs)
