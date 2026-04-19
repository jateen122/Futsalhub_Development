# backend/bookings/serializers.py
from decimal import Decimal
from datetime import datetime, timedelta
from rest_framework import serializers
from django.utils import timezone
from .models import Booking, LoyaltyRecord, ReschedulingToken, LOYALTY_THRESHOLD, CANCEL_WINDOW_HOURS


class BookingSerializer(serializers.ModelSerializer):
    user_email  = serializers.EmailField(source="user.email",  read_only=True)
    ground_name = serializers.CharField(source="ground.name",  read_only=True)
    can_cancel_with_token = serializers.SerializerMethodField()
    hours_until_slot      = serializers.SerializerMethodField()
    payment_method        = serializers.SerializerMethodField()
    can_cancel            = serializers.SerializerMethodField()

    class Meta:
        model  = Booking
        fields = [
            "id", "user", "user_email", "ground", "ground_name",
            "date", "start_time", "end_time", "total_price",
            "status", "is_free_booking", "payment_received", "created_at",
            "can_cancel_with_token", "hours_until_slot",
            "payment_method", "can_cancel",
        ]
        read_only_fields = [
            "id", "user", "user_email", "ground_name",
            "total_price", "status", "is_free_booking", "payment_received", "created_at",
            "can_cancel_with_token", "hours_until_slot",
            "payment_method", "can_cancel",
        ]

    def get_can_cancel_with_token(self, obj):
        """True only for Khalti-paid confirmed bookings cancelled 4h+ before slot."""
        if obj.status not in [Booking.Status.PENDING, Booking.Status.CONFIRMED]:
            return False
        try:
            can_cancel = obj.can_cancel_with_token()
        except Exception:
            return False
        if not can_cancel:
            return False
        if obj.is_free_booking:
            return False
        return obj.payments.filter(status="SUCCESS", payment_method="khalti").exists()

    def get_can_cancel(self, obj):
        """Cancel button is visible only when the slot is 4+ hours away."""
        if obj.status not in [Booking.Status.PENDING, Booking.Status.CONFIRMED]:
            return False
        try:
            return obj.can_cancel_with_token()
        except Exception:
            return False

    def get_hours_until_slot(self, obj):
        try:
            return round(obj.hours_until_slot(), 1)
        except Exception:
            return None

    def get_payment_method(self, obj):
        """Returns 'khalti', 'cash', 'free', or 'unknown'."""
        if obj.is_free_booking:
            return "free"
        payment = obj.payments.filter(status="SUCCESS").order_by("-created_at").first()
        if payment:
            return payment.payment_method
        pending_payment = obj.payments.order_by("-created_at").first()
        if pending_payment:
            return pending_payment.payment_method
        return "unknown"

    def validate_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Booking date cannot be in the past.")
        return value

    def validate(self, attrs):
        start  = attrs.get("start_time")
        end    = attrs.get("end_time")
        ground = attrs.get("ground")
        date   = attrs.get("date")

        if start and end:
            if start >= end:
                raise serializers.ValidationError(
                    {"end_time": "End time must be after start time."}
                )

            if date:
                slot_dt = timezone.make_aware(datetime.combine(date, start))
                cutoff  = timezone.now() + timedelta(minutes=30)
                if slot_dt < cutoff:
                    raise serializers.ValidationError(
                        "You must book at least 30 minutes before the slot starts. "
                        "Please choose a later time slot."
                    )

            start_dt    = datetime.combine(datetime.today(), start)
            end_dt      = datetime.combine(datetime.today(), end)
            duration_hr = Decimal(str((end_dt - start_dt).total_seconds() / 3600))

            if ground:
                attrs["total_price"] = (ground.price_per_hour * duration_hr).quantize(Decimal("0.01"))

        return attrs

    def create(self, validated_data):
        return Booking.objects.create(**validated_data)


class BookingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model            = Booking
        fields           = ["id", "status", "ground", "date", "start_time", "end_time", "is_free_booking", "payment_received"]
        read_only_fields = ["id", "ground", "date", "start_time", "end_time", "is_free_booking", "payment_received"]


class ReschedulingTokenSerializer(serializers.ModelSerializer):
    original_ground_name     = serializers.CharField(source="original_ground.name",     read_only=True)
    original_ground_location = serializers.CharField(source="original_ground.location", read_only=True)
    is_valid                 = serializers.SerializerMethodField()
    is_expired               = serializers.SerializerMethodField()
    days_until_expiry        = serializers.SerializerMethodField()

    class Meta:
        model  = ReschedulingToken
        fields = [
            "id", "token", "original_ground", "original_ground_name",
            "original_ground_location", "original_date", "original_start_time",
            "original_end_time", "original_price", "is_used", "is_valid",
            "is_expired", "days_until_expiry", "created_at", "expires_at",
        ]
        read_only_fields = fields

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_days_until_expiry(self, obj):
        if obj.is_used or obj.is_expired():
            return 0
        delta = obj.expires_at - timezone.now()
        return max(0, delta.days)


class LoyaltySerializer(serializers.ModelSerializer):
    ground_name              = serializers.CharField(source="ground.name",     read_only=True)
    ground_location          = serializers.CharField(source="ground.location", read_only=True)
    ground_image             = serializers.SerializerMethodField()
    free_bookings_available  = serializers.IntegerField(read_only=True)
    bookings_until_next_free = serializers.IntegerField(read_only=True)
    progress_to_next_free    = serializers.IntegerField(read_only=True)
    loyalty_threshold        = serializers.SerializerMethodField()

    class Meta:
        model  = LoyaltyRecord
        fields = [
            "id", "ground", "ground_name", "ground_location", "ground_image",
            "confirmed_count", "free_bookings_earned", "free_bookings_used",
            "free_bookings_available", "bookings_until_next_free",
            "progress_to_next_free", "loyalty_threshold", "updated_at",
        ]
        read_only_fields = fields

    def get_ground_image(self, obj):
        request = self.context.get("request")
        if obj.ground.image:
            if request:
                return request.build_absolute_uri(obj.ground.image.url)
            return obj.ground.image.url
        return None

    def get_loyalty_threshold(self, obj):
        return LOYALTY_THRESHOLD