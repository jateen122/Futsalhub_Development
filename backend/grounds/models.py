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
    # ── GPS coordinates (optional) ────────────────────────────────────────────
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True,
        verbose_name="Latitude",
        help_text="GPS latitude of the ground location.",
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True,
        verbose_name="Longitude",
        help_text="GPS longitude of the ground location.",
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Ground"
        verbose_name_plural = "Grounds"

    def __str__(self):
        return f"{self.name} — {self.location}"


# ─────────────────────────────────────────────────────────────────────────────
# FAVORITE — lives inside grounds app, no separate app needed
# ─────────────────────────────────────────────────────────────────────────────

class Favorite(models.Model):
    """
    Stores a user's saved/favorite grounds.
    unique_together ensures one record per user-ground pair.
    """
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    ground     = models.ForeignKey(
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
