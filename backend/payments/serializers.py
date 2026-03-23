from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    ground_name        = serializers.CharField(source="booking.ground.name",       read_only=True)
    booking_date       = serializers.DateField(source="booking.date",              read_only=True)
    booking_start_time = serializers.TimeField(source="booking.start_time",        read_only=True)
    booking_end_time   = serializers.TimeField(source="booking.end_time",          read_only=True)
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )

    class Meta:
        model  = Payment
        fields = [
            "id",
            "booking",
            "ground_name",
            "booking_date",
            "booking_start_time",
            "booking_end_time",
            "pidx",
            "transaction_id",
            "amount",
            "status",
            "payment_method",
            "payment_method_display",
            "khalti_status",
            "created_at",
        ]
        read_only_fields = fields
