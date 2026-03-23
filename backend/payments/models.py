from django.db import models
from django.conf import settings


class Payment(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending",   "Pending"
        SUCCESS = "success",   "Success"
        FAILED  = "failed",    "Failed"
        REFUNDED= "refunded",  "Refunded"

    class Method(models.TextChoices):
        KHALTI = "khalti", "Khalti"
        CASH   = "cash",   "Cash"

    user    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payments",
    )

    # Khalti identifiers
    pidx              = models.CharField(max_length=100, blank=True, default="")
    purchase_order_id = models.CharField(max_length=100, blank=True, default="")
    transaction_id    = models.CharField(max_length=100, blank=True, default="")
    khalti_status     = models.CharField(max_length=50,  blank=True, default="")

    # Our fields
    amount         = models.DecimalField(max_digits=10, decimal_places=2)
    status         = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
    )
    payment_method = models.CharField(
        max_length=10,
        choices=Method.choices,
        default=Method.KHALTI,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self):
        return f"Payment #{self.id} — {self.user.email} — Rs {self.amount} [{self.status}]"
