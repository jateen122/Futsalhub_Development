from django.db import models
from django.conf import settings


class Ground(models.Model):
    """
    Represents a futsal ground listed by an owner.
    Grounds must be approved by an admin before appearing publicly.
    """

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
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering        = ["-created_at"]
        verbose_name    = "Ground"
        verbose_name_plural = "Grounds"

    def __str__(self):
        return f"{self.name} — {self.location} (owner: {self.owner.email})"

    @property
    def is_open_now(self):
        """Convenience helper — checks if the ground is open at this moment."""
        from django.utils import timezone
        now = timezone.localtime().time()
        return self.opening_time <= now <= self.closing_time
