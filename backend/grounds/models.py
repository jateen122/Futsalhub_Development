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
        max_length=2, choices=SurfaceSize.choices, default=SurfaceSize.SIZE_5,
    )
    ground_type     = models.CharField(
        max_length=10, choices=GroundType.choices, default=GroundType.OUTDOOR,
    )
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
        Returns effective price per hour for a given date + start hour.
        Priority:
          1. Active PEAK rule  → surcharge price
          2. Active OFF_PEAK rule → discount price
          3. Base price
        """
        day_of_week = date.weekday() if hasattr(date, "weekday") else -1
        rules = self.peak_pricing_rules.filter(is_active=True)

        # Check peak rules first (they override off-peak if both match)
        for rule in rules:
            if getattr(rule, "rule_type", "peak") == "off_peak":
                continue
            day_match  = (rule.day_of_week == -1 or rule.day_of_week == day_of_week)
            hour_match = rule.start_hour <= start_hour < rule.end_hour
            if day_match and hour_match:
                return rule.price_per_hour

        # Check off-peak rules
        for rule in rules:
            if getattr(rule, "rule_type", "peak") != "off_peak":
                continue
            day_match  = (rule.day_of_week == -1 or rule.day_of_week == day_of_week)
            hour_match = rule.start_hour <= start_hour < rule.end_hour
            if day_match and hour_match:
                return rule.price_per_hour

        return self.price_per_hour

    def is_slot_blocked(self, date, start_hour):
        """Returns (is_blocked: bool, reason: str | None)."""
        day_of_week   = date.weekday()
        active_blocks = self.blocked_slots.filter(is_active=True)

        for block in active_blocks:
            if block.block_type == "date":
                if block.blocked_date != date:
                    continue
            elif block.block_type == "recurring":
                if block.day_of_week != day_of_week:
                    continue

            # Full-day block
            if block.start_hour is None or block.end_hour is None:
                return True, block.reason or "Unavailable"

            # Hour-range block
            if block.start_hour <= start_hour < block.end_hour:
                return True, block.reason or "Unavailable"

        return False, None


class Favorite(models.Model):
    user   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites",
    )
    ground = models.ForeignKey(Ground, on_delete=models.CASCADE, related_name="favorited_by")
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
    Pricing rule for a ground.
    rule_type = "peak"     → higher price during busy hours
    rule_type = "off_peak" → discounted price during slow hours
    """

    RULE_TYPE_CHOICES = [
        ("peak",     "Peak Pricing"),
        ("off_peak", "Off-Peak Discount"),
    ]

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
        Ground, on_delete=models.CASCADE, related_name="peak_pricing_rules",
    )
    rule_type = models.CharField(
        max_length=10,
        choices=RULE_TYPE_CHOICES,
        default="peak",
        help_text="'peak' for higher prices, 'off_peak' for discounts",
    )
    day_of_week = models.IntegerField(
        choices=DAY_CHOICES,
        default=-1,
        help_text="0=Monday … 6=Sunday. Use -1 for all days.",
    )
    start_hour = models.PositiveSmallIntegerField(help_text="Start hour (0–23)")
    end_hour   = models.PositiveSmallIntegerField(help_text="End hour (0–23), exclusive")
    price_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Price per hour during this period",
    )
    label = models.CharField(
        max_length=100, default="Peak Hours",
        help_text='e.g. "Evening Peak", "Morning Discount"',
    )
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["rule_type", "start_hour"]
        verbose_name        = "Pricing Rule"
        verbose_name_plural = "Pricing Rules"

    def __str__(self):
        day_name   = dict(self.DAY_CHOICES).get(self.day_of_week, "All Days")
        rule_label = "Peak" if self.rule_type == "peak" else "Off-Peak"
        return (
            f"{self.ground.name} | [{rule_label}] {self.label} | "
            f"{day_name} {self.start_hour:02d}:00–{self.end_hour:02d}:00 "
            f"→ Rs {self.price_per_hour}/hr"
        )


class BlockedSlot(models.Model):

    BLOCK_TYPE_CHOICES = [
        ("date",      "Specific Date"),
        ("recurring", "Recurring Day"),
    ]

    DAY_CHOICES = [
        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
    ]

    ground       = models.ForeignKey(Ground, on_delete=models.CASCADE, related_name="blocked_slots")
    block_type   = models.CharField(max_length=10, choices=BLOCK_TYPE_CHOICES, default="date")
    blocked_date = models.DateField(null=True, blank=True)
    day_of_week  = models.IntegerField(null=True, blank=True, choices=DAY_CHOICES, help_text="0=Monday…6=Sunday")
    start_hour   = models.PositiveSmallIntegerField(null=True, blank=True)
    end_hour     = models.PositiveSmallIntegerField(null=True, blank=True)
    reason       = models.CharField(max_length=200, blank=True, default="")
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["ground", "blocked_date", "day_of_week", "start_hour"]
        verbose_name        = "Blocked Slot"
        verbose_name_plural = "Blocked Slots"

    def __str__(self):
        if self.block_type == "date":
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