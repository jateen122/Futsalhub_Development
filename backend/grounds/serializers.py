from rest_framework import serializers
from .models import Ground


class GroundSerializer(serializers.ModelSerializer):
    """
    Full serializer used for create / update / detail.

    Rules:
      • owner        → read-only, exposes only the owner's email address.
      • is_approved  → read-only (owners cannot approve their own grounds;
                        approval is done through a separate admin-only endpoint).
    """

    # Replace the raw FK integer with the owner's email — read-only
    owner = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model  = Ground
        fields = [
            "id",
            "owner",
            "name",
            "location",
            "description",
            "price_per_hour",
            "opening_time",
            "closing_time",
            "facilities",
            "image",
            "is_approved",
            "created_at",
        ]
        read_only_fields = ["id", "owner", "is_approved", "created_at"]

    # ── Validation ────────────────────────────────────────────────────────────

    def validate(self, attrs):
        opening = attrs.get("opening_time") or (
            self.instance.opening_time if self.instance else None
        )
        closing = attrs.get("closing_time") or (
            self.instance.closing_time if self.instance else None
        )
        if opening and closing and opening >= closing:
            raise serializers.ValidationError(
                {"closing_time": "Closing time must be after opening time."}
            )
        return attrs

    def validate_price_per_hour(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price per hour must be greater than zero.")
        return value


class GroundApprovalSerializer(serializers.ModelSerializer):
    """
    Minimal serializer used exclusively by the admin approve endpoint.
    Only exposes is_approved so nothing else can be accidentally changed.
    """

    class Meta:
        model  = Ground
        fields = ["id", "name", "is_approved"]
        read_only_fields = ["id", "name"]


class PublicGroundSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the public listing endpoint.
    Strips internal / sensitive fields.
    """

    owner = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model  = Ground
        fields = [
            "id",
            "owner",
            "name",
            "location",
            "description",
            "price_per_hour",
            "opening_time",
            "closing_time",
            "facilities",
            "image",
        ]
