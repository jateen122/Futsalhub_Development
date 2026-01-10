from django.db import models
from django.contrib.auth.models import User

class Ground(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    price_per_hour = models.DecimalField(max_digits=6, decimal_places=2)
    is_approved = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Booking(models.Model):
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    ground = models.ForeignKey(Ground, on_delete=models.CASCADE)
    booking_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, default="CONFIRMED")

    def __str__(self):
        return f"{self.player} - {self.ground}"
