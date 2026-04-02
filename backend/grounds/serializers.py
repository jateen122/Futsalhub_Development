# backend/grounds/serializers.py
from rest_framework import serializers
from .models import Ground, Favorite, PeakPricingRule, BlockedSlot


# ─── Peak Pricing Serializer ──────────────────────────────────────────────────

class PeakPricingRuleSerializer(serializers.ModelSerializer):
    day_of_week_display = serializers.SerializerMethodField()

    class Meta:
        model  = PeakPricingRule
        fields = [
            "id", "day_of_week", "day_of_week_display",
            "start_hour", "end_hour", "price_per_hour",
            "label", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at", "day_of_week_display"]

    def get_day_of_week_display(self, obj):
        return dict(PeakPricingRule.DAY_CHOICES).get(obj.day_of_week, "All Days")

    def validate(self, attrs):
        start = attrs.get("start_hour", getattr(self.instance, "start_hour", None))
        end   = attrs.get("end_hour",   getattr(self.instance, "end_hour",   None))
        if start is not None and end is not None:
            if start >= end:
                raise serializers.ValidationError(
                    {"end_hour": "End hour must be after start hour."}
                )
            if start < 0 or end > 24:
                raise serializers.ValidationError("Hours must be between 0 and 24.")
        price = attrs.get("price_per_hour")
        if price is not None and price <= 0:
            raise serializers.ValidationError(
                {"price_per_hour": "Price must be greater than zero."}
            )
        return attrs


# ─── Blocked Slot Serializer ──────────────────────────────────────────────────

class BlockedSlotSerializer(serializers.ModelSerializer):
    block_type_display  = serializers.CharField(source="get_block_type_display",  read_only=True)
    day_of_week_display = serializers.SerializerMethodField()
    is_full_day         = serializers.BooleanField(read_only=True)

    class Meta:
        model  = BlockedSlot
        fields = [
            "id", "block_type", "block_type_display",
            "blocked_date", "day_of_week", "day_of_week_display",
            "start_hour", "end_hour",
            "reason", "is_active", "is_full_day", "created_at",
        ]
        read_only_fields = ["id", "created_at", "block_type_display", "day_of_week_display", "is_full_day"]

    def get_day_of_week_display(self, obj):
        if obj.day_of_week is None:
            return None
        return dict(BlockedSlot.DAY_CHOICES).get(obj.day_of_week, "Unknown")

    def validate(self, attrs):
        block_type   = attrs.get("block_type",   getattr(self.instance, "block_type",   None))
        blocked_date = attrs.get("blocked_date",  getattr(self.instance, "blocked_date",  None))
        day_of_week  = attrs.get("day_of_week",   getattr(self.instance, "day_of_week",   None))
        start_hour   = attrs.get("start_hour",    getattr(self.instance, "start_hour",    None))
        end_hour     = attrs.get("end_hour",      getattr(self.instance, "end_hour",      None))

        if block_type == "date" and not blocked_date:
            raise serializers.ValidationError(
                {"blocked_date": "A specific date is required for block_type='date'."}
            )
        if block_type == "recurring" and day_of_week is None:
            raise serializers.ValidationError(
                {"day_of_week": "A day of week is required for block_type='recurring'."}
            )

        # If partial hour block, both start and end must be provided
        if (start_hour is None) != (end_hour is None):
            raise serializers.ValidationError(
                "Both start_hour and end_hour must be provided together, or both left blank for a full-day block."
            )
        if start_hour is not None and end_hour is not None:
            if start_hour >= end_hour:
                raise serializers.ValidationError(
                    {"end_hour": "End hour must be after start hour."}
                )
            if start_hour < 0 or end_hour > 24:
                raise serializers.ValidationError("Hours must be between 0 and 24.")

        return attrs


# ─── Ground serializers ───────────────────────────────────────────────────────

class GroundSerializer(serializers.ModelSerializer):
    owner               = serializers.EmailField(source="owner.email", read_only=True)
    ground_size_display = serializers.CharField(source="get_ground_size_display", read_only=True)
    ground_type_display = serializers.CharField(source="get_ground_type_display", read_only=True)
    peak_pricing_rules  = PeakPricingRuleSerializer(many=True, read_only=True)
    blocked_slots       = BlockedSlotSerializer(many=True, read_only=True)

    class Meta:
        model  = Ground
        fields = [
            "id", "owner", "name", "location", "description",
            "price_per_hour", "opening_time", "closing_time",
            "facilities", "image",
            "ground_size", "ground_size_display",
            "ground_type", "ground_type_display",
            "latitude", "longitude",
            "is_approved", "created_at",
            "peak_pricing_rules",
            "blocked_slots",
        ]
        read_only_fields = [
            "id", "owner", "is_approved", "created_at",
            "ground_size_display", "ground_type_display",
            "peak_pricing_rules", "blocked_slots",
        ]

    def validate(self, attrs):
        opening = attrs.get("opening_time") or (self.instance.opening_time if self.instance else None)
        closing = attrs.get("closing_time") or (self.instance.closing_time if self.instance else None)
        if opening and closing and opening >= closing:
            raise serializers.ValidationError({"closing_time": "Closing time must be after opening time."})
        return attrs

    def validate_price_per_hour(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value


class GroundApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model            = Ground
        fields           = ["id", "name", "is_approved"]
        read_only_fields = ["id", "name"]


class PublicGroundSerializer(serializers.ModelSerializer):
    owner               = serializers.EmailField(source="owner.email", read_only=True)
    ground_size_display = serializers.CharField(source="get_ground_size_display", read_only=True)
    ground_type_display = serializers.CharField(source="get_ground_type_display", read_only=True)
    peak_pricing_rules  = PeakPricingRuleSerializer(many=True, read_only=True)
    blocked_slots       = BlockedSlotSerializer(many=True, read_only=True)

    class Meta:
        model  = Ground
        fields = [
            "id", "owner", "name", "location", "description",
            "price_per_hour", "opening_time", "closing_time",
            "facilities", "image",
            "ground_size", "ground_size_display",
            "ground_type", "ground_type_display",
            "latitude", "longitude",
            "peak_pricing_rules",
            "blocked_slots",
        ]


# ─── Favorite serializer ──────────────────────────────────────────────────────

class FavoriteSerializer(serializers.ModelSerializer):
    ground_id      = serializers.IntegerField(source="ground.id",            read_only=True)
    name           = serializers.CharField(source="ground.name",             read_only=True)
    location       = serializers.CharField(source="ground.location",         read_only=True)
    description    = serializers.CharField(source="ground.description",      read_only=True)
    price_per_hour = serializers.DecimalField(source="ground.price_per_hour",
                                              max_digits=10, decimal_places=2, read_only=True)
    opening_time   = serializers.TimeField(source="ground.opening_time",     read_only=True)
    closing_time   = serializers.TimeField(source="ground.closing_time",     read_only=True)
    facilities     = serializers.CharField(source="ground.facilities",       read_only=True)
    is_approved    = serializers.BooleanField(source="ground.is_approved",   read_only=True)
    owner_email    = serializers.EmailField(source="ground.owner.email",     read_only=True)
    ground_size    = serializers.CharField(source="ground.ground_size",      read_only=True)
    ground_type    = serializers.CharField(source="ground.ground_type",      read_only=True)
    latitude       = serializers.DecimalField(source="ground.latitude",
                                              max_digits=10, decimal_places=7,
                                              read_only=True, allow_null=True)
    longitude      = serializers.DecimalField(source="ground.longitude",
                                              max_digits=10, decimal_places=7,
                                              read_only=True, allow_null=True)
    image          = serializers.SerializerMethodField()

    class Meta:
        model  = Favorite
        fields = [
            "id", "ground_id", "name", "location", "description",
            "price_per_hour", "opening_time", "closing_time",
            "facilities", "image", "is_approved", "owner_email",
            "ground_size", "ground_type",
            "latitude", "longitude",
            "created_at",
        ]
        read_only_fields = fields

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.ground.image:
            if request:
                return request.build_absolute_uri(obj.ground.image.url)
            return obj.ground.image.url
        return None