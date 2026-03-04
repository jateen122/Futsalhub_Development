from decimal import Decimal
from datetime import datetime
from rest_framework import serializers
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    """
    Main serializer for creating and reading bookings.

    Rules:
      • user         → read-only (auto-assigned from request.user)
      • total_price  → read-only (auto-calculated from ground price × duration)
      • ground_name  → extra read-only field showing the ground name
      • user_email   → extra read-only field showing the booker's email
    """

    # Read-only display fields
    user_email  = serializers.EmailField(source="user.email",   read_only=True)
    ground_name = serializers.CharField(source="ground.name",   read_only=True)

    class Meta:
        model  = Booking
        fields = [
            "id",
            "user",
            "user_email",
            "ground",
            "ground_name",
            "date",
            "start_time",
            "end_time",
            "total_price",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_email",
            "ground_name",
            "total_price",
            "status",
            "created_at",
        ]

    # ── Field-level validation ─────────────────────────────────────────────

    def validate_date(self, value):
        from django.utils import timezone
        if value < timezone.localdate():
            raise serializers.ValidationError("Booking date cannot be in the past.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_time")
        end   = attrs.get("end_time")
        ground = attrs.get("ground")

        if start and end:
            if start >= end:
                raise serializers.ValidationError(
                    {"end_time": "End time must be after start time."}
                )

            # ── Auto-calculate total_price ─────────────────────────────────
            # Duration in hours (as Decimal for precision)
            start_dt    = datetime.combine(datetime.today(), start)
            end_dt      = datetime.combine(datetime.today(), end)
            duration_hr = Decimal(
                str((end_dt - start_dt).total_seconds() / 3600)
            )

            if ground:
                attrs["total_price"] = (ground.price_per_hour * duration_hr).quantize(
                    Decimal("0.01")
                )

        return attrs

    def create(self, validated_data):
        """
        Overlap check is enforced inside Booking.clean() which is called
        by Booking.save() → full_clean(). Any conflict raises ValidationError
        which DRF converts to a 400 response automatically.
        """
        return Booking.objects.create(**validated_data)


class BookingStatusSerializer(serializers.ModelSerializer):
    """
    Minimal serializer used only for the cancel endpoint.
    Exposes just enough to confirm the status change.
    """

    class Meta:
        model            = Booking
        fields           = ["id", "status", "ground", "date", "start_time", "end_time"]
        read_only_fields = ["id", "ground", "date", "start_time", "end_time"]
