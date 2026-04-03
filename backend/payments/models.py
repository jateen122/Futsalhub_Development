from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Payment(models.Model):
    class Status(models.TextChoices):
        INIT = "INIT", "Initiated"
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    class Method(models.TextChoices):
        KHALTI = "khalti", "Khalti"
        CASH = "cash", "Cash"
        FREE = "free", "Free Booking"

    user    = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments"
    )

    # Khalti identifiers
    pidx              = models.CharField(max_length=100, blank=True, default="")
    purchase_order_id = models.CharField(max_length=100, unique=True)
    transaction_id    = models.CharField(max_length=100, blank=True, null=True)
    khalti_status     = models.CharField(max_length=50,  blank=True, default="")

    # Our fields
    amount         = models.DecimalField(max_digits=10, decimal_places=2)
    status         = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INIT,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Method.choices,
        default=Method.KHALTI,
    )
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.purchase_order_id} - {self.status}"
