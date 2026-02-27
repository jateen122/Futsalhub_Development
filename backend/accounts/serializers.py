from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# Registration Serializer
# ─────────────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new user registration.

    Rules:
      • PLAYER  → auto verified
      • OWNER   → requires admin verification
      • ADMIN   → cannot be self-registered
      • Password is validated and properly hashed
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        label="Confirm password",
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "password",
            "password2",
        ]
        read_only_fields = ["id"]

    # ─────────────────────────────────────────────────────────────────────────
    # FIELD VALIDATION
    # ─────────────────────────────────────────────────────────────────────────

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value):
        value = value.lower()
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("You cannot register as admin.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    # ─────────────────────────────────────────────────────────────────────────
    # CREATE USER (IMPORTANT PART)
    # ─────────────────────────────────────────────────────────────────────────

    def create(self, validated_data):
        validated_data.pop("password2")

        password = validated_data.pop("password")
        role = validated_data.get("role", User.Role.PLAYER)

        # Verification rule
        is_verified = True if role == User.Role.PLAYER else False

        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            password=password,   # hashed automatically
            phone=validated_data.get("phone", ""),
            role=role,
            is_verified=is_verified,
        )

        return user


# ─────────────────────────────────────────────────────────────────────────────
# Profile Serializer
# ─────────────────────────────────────────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    """
    Read-only / partial update serializer for authenticated user.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "is_verified",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "role",
            "is_verified",
            "is_active",
            "created_at",
        ]