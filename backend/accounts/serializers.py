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

    # ── Field-level validation ─────────────────────────────────────────────

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

    # ── Create user ────────────────────────────────────────────────────────

    def create(self, validated_data):
        validated_data.pop("password2")

        password = validated_data.pop("password")
        role = validated_data.get("role", User.Role.PLAYER)

        is_verified = True if role == User.Role.PLAYER else False

        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            password=password,
            phone=validated_data.get("phone", ""),
            role=role,
            is_verified=is_verified,
        )

        return user


# ─────────────────────────────────────────────────────────────────────────────
# Profile Serializer  (read + partial update, now includes image & city)
# ─────────────────────────────────────────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    """
    Read / partial-update serializer for the authenticated user.

    Writable fields : full_name, phone, city, profile_image
    Read-only fields: id, email, role, is_verified, is_active, created_at
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "city",
            "profile_image",
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


# ─────────────────────────────────────────────────────────────────────────────
# Change Password Serializer
# ─────────────────────────────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """
    Validates the old password and the new password pair.
    Used by PATCH /api/accounts/change-password/
    """

    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from the old one."}
            )
        return attrs


# ─────────────────────────────────────────────────────────────────────────────
# Forgot Password Serializer  (simulated — no real email sending)
# ─────────────────────────────────────────────────────────────────────────────

class ForgotPasswordSerializer(serializers.Serializer):
    """
    Accepts an email address and simulates sending a password-reset link.
    No email is actually dispatched; a success message is always returned
    so as not to leak whether an account exists.
    """

    email = serializers.EmailField(required=True)


# ─────────────────────────────────────────────────────────────────────────────
# Admin User List Serializer  (lightweight, read-only)
# ─────────────────────────────────────────────────────────────────────────────

class UserListSerializer(serializers.ModelSerializer):
    """
    Minimal read-only serializer used by the admin user-list endpoint.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "city",
            "profile_image",
            "role",
            "is_verified",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields
