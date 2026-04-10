# backend/payments/serializers.py
from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    ground_name            = serializers.SerializerMethodField()
    booking_date           = serializers.SerializerMethodField()
    booking_start_time     = serializers.SerializerMethodField()
    booking_end_time       = serializers.SerializerMethodField()
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

    def get_ground_name(self, obj):
        # Try booking first, fall back to extra_data
        try:
            if obj.booking:
                return obj.booking.ground.name
        except Exception:
            pass
        # If booking not linked yet (e.g. INIT), try extra_data
        extra = obj.extra_data or {}
        ground_id = extra.get("ground_id")
        if ground_id:
            try:
                from grounds.models import Ground
                return Ground.objects.get(pk=ground_id).name
            except Exception:
                pass
        return "—"

    def get_booking_date(self, obj):
        try:
            if obj.booking:
                return str(obj.booking.date)
        except Exception:
            pass
        extra = obj.extra_data or {}
        return extra.get("date", "—")

    def get_booking_start_time(self, obj):
        try:
            if obj.booking:
                return str(obj.booking.start_time)
        except Exception:
            pass
        extra = obj.extra_data or {}
        return extra.get("start_time", "—")

    def get_booking_end_time(self, obj):
        try:
            if obj.booking:
                return str(obj.booking.end_time)
        except Exception:
            pass
        extra = obj.extra_data or {}
        return extra.get("end_time", "—")