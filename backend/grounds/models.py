# backend/grounds/models.py
from django.db import models
from django.conf import settings


class Ground(models.Model):

    class SurfaceSize(models.TextChoices):
        SIZE_5 = "5", "5-a-side"
        SIZE_6 = "6", "6-a-side"
        SIZE_7 = "7", "7-a-side"

    class GroundType(models.TextChoices):
        INDOOR  = "indoor",  "Indoor"
        OUTDOOR = "outdoor", "Outdoor"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="grounds",
        limit_choices_to={"role": "owner"},
    )
    name            = models.CharField(max_length=200)
    location        = models.CharField(max_length=300)
    description     = models.TextField()
    price_per_hour  = models.DecimalField(max_digits=10, decimal_places=2)
    opening_time    = models.TimeField()
    closing_time    = models.TimeField()
    facilities      = models.TextField(blank=True)
    image           = models.ImageField(upload_to="grounds/", blank=True, null=True)
    is_approved     = models.BooleanField(default=False)
    ground_size     = models.CharField(
        max_length=2,
        choices=SurfaceSize.choices,
        default=SurfaceSize.SIZE_5,
    )
    ground_type     = models.CharField(
        max_length=10,
        choices=GroundType.choices,
        default=GroundType.OUTDOOR,
    )
    # GPS coordinates (optional)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=7, blank=True, null=True,
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=7, blank=True, null=True,
        verbose_name="Longitude",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Ground"
        verbose_name_plural = "Grounds"

    def __str__(self):
        return f"{self.name} — {self.location}"

    def get_price_for_slot(self, date, start_hour):
        """
        Returns the applicable price per hour for a given date + start hour.
        Checks active peak pricing rules; falls back to base price.
        """
        day_of_week = date.weekday() if hasattr(date, 'weekday') else -1

        rules = self.peak_pricing_rules.filter(is_active=True)
        for rule in rules:
            day_match  = (rule.day_of_week == -1 or rule.day_of_week == day_of_week)
            hour_match = rule.start_hour <= start_hour < rule.end_hour
            if day_match and hour_match:
                return rule.price_per_hour
        return self.price_per_hour

    def is_slot_blocked(self, date, start_hour):
        """
        Returns (is_blocked: bool, reason: str | None).
        Checks active BlockedSlot records for a specific date + hour combination.
        """
        day_of_week = date.weekday()

        active_blocks = self.blocked_slots.filter(is_active=True)

        for block in active_blocks:
            # Check date match
            if block.block_type == 'date':
                if block.blocked_date != date:
                    continue
            elif block.block_type == 'recurring':
                if block.day_of_week != day_of_week:
                    continue

            # Full day block
            if block.start_hour is None or block.end_hour is None:
                return True, block.reason or "Unavailable"

            # Hour range block
            if block.start_hour <= start_hour < block.end_hour:
                return True, block.reason or "Unavailable"

        return False, None


class Favorite(models.Model):
    user   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    ground = models.ForeignKey(
        Ground,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together     = ("user", "ground")
        ordering            = ["-created_at"]
        verbose_name        = "Favorite"
        verbose_name_plural = "Favorites"

    def __str__(self):
        return f"{self.user.email} ♥ {self.ground.name}"


class PeakPricingRule(models.Model):
    """
    Defines a peak pricing window for a ground.
    """

    DAY_CHOICES = [
        (-1, "All Days"),
        (0,  "Monday"),
        (1,  "Tuesday"),
        (2,  "Wednesday"),
        (3,  "Thursday"),
        (4,  "Friday"),
        (5,  "Saturday"),
        (6,  "Sunday"),
    ]

    ground = models.ForeignKey(
        Ground,
        on_delete=models.CASCADE,
        related_name="peak_pricing_rules",
    )
    day_of_week = models.IntegerField(
        choices=DAY_CHOICES,
        default=-1,
        help_text="0=Monday … 6=Sunday. Use -1 for all days.",
    )
    start_hour = models.PositiveSmallIntegerField(
        help_text="Peak period start hour (0–23)"
    )
    end_hour = models.PositiveSmallIntegerField(
        help_text="Peak period end hour (0–23), exclusive"
    )
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Price per hour during this period",
    )
    label = models.CharField(
        max_length=100, default="Peak Hours",
        help_text='e.g. "Evening Peak", "Weekend Rate"',
    )
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["start_hour"]
        verbose_name        = "Peak Pricing Rule"
        verbose_name_plural = "Peak Pricing Rules"

    def __str__(self):
        day_name = dict(self.DAY_CHOICES).get(self.day_of_week, "All Days")
        return (
            f"{self.ground.name} | {self.label} | "
            f"{day_name} {self.start_hour:02d}:00–{self.end_hour:02d}:00 "
            f"→ Rs {self.price_per_hour}/hr"
        )


class BlockedSlot(models.Model):
    """
    Allows ground owners to block specific dates or recurring weekdays
    for maintenance, private events, or closures.
    Players cannot book slots that overlap with an active block.
    """

    BLOCK_TYPE_CHOICES = [
        ('date',      'Specific Date'),
        ('recurring', 'Recurring Day'),
    ]

    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    ground = models.ForeignKey(
        Ground,
        on_delete=models.CASCADE,
        related_name="blocked_slots",
    )
    block_type = models.CharField(
        max_length=10,
        choices=BLOCK_TYPE_CHOICES,
        default='date',
    )
    # Used when block_type == 'date'
    blocked_date = models.DateField(null=True, blank=True)

    # Used when block_type == 'recurring'
    day_of_week = models.IntegerField(
        null=True, blank=True,
        choices=DAY_CHOICES,
        help_text="0=Monday…6=Sunday",
    )

    # If both null → full day block; otherwise hour range
    start_hour = models.PositiveSmallIntegerField(null=True, blank=True)
    end_hour   = models.PositiveSmallIntegerField(null=True, blank=True)

    reason    = models.CharField(max_length=200, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ['ground', 'blocked_date', 'day_of_week', 'start_hour']
        verbose_name        = "Blocked Slot"
        verbose_name_plural = "Blocked Slots"

    def __str__(self):
        if self.block_type == 'date':
            time_part = (
                f"{self.start_hour:02d}:00–{self.end_hour:02d}:00"
                if self.start_hour is not None else "All Day"
            )
            return f"{self.ground.name} | {self.blocked_date} | {time_part}"
        else:
            day_name  = dict(self.DAY_CHOICES).get(self.day_of_week, "?")
            time_part = (
                f"{self.start_hour:02d}:00–{self.end_hour:02d}:00"
                if self.start_hour is not None else "All Day"
            )
            return f"{self.ground.name} | Every {day_name} | {time_part}"

    @property
    def is_full_day(self):
        return self.start_hour is None or self.end_hour is None