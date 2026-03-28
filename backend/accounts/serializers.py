from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


# ─── Registration ──────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new user registration.
    - Players are created with is_verified=False (must verify email via OTP).
    - Admins cannot self-register.
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
        label="Confirm password",
    )

    class Meta:
        model  = User
        fields = ["id", "email", "full_name", "phone", "role", "password", "password2"]
        read_only_fields = ["id"]

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

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        role     = validated_data.get("role", User.Role.PLAYER)

        user = User.objects.create_user(
            email     = validated_data["email"],
            full_name = validated_data["full_name"],
            password  = password,
            phone     = validated_data.get("phone", ""),
            role      = role,
            # All new users start unverified — OTP flow verifies them
            is_verified = False,
        )
        return user


# ─── OTP Verification ──────────────────────────────────────────────────────────

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp   = serializers.CharField(min_length=6, max_length=6)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must contain only digits.")
        return value


# ─── Resend OTP ────────────────────────────────────────────────────────────────

class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


# ─── Profile (unchanged from original) ────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "phone", "city",
            "profile_image", "role", "is_verified", "is_active", "created_at",
        ]
        read_only_fields = ["id", "email", "role", "is_verified", "is_active", "created_at"]


# ─── Change Password ───────────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must differ from the old one."}
            )
        return attrs


# ─── Forgot Password ───────────────────────────────────────────────────────────

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


# ─── Admin User List ───────────────────────────────────────────────────────────

class UserListSerializer(serializers.ModelSerializer):
    email_verified = serializers.BooleanField(source="is_verified", read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "phone", "city",
            "profile_image", "role", "is_verified", "email_verified",
            "is_active", "created_at",
        ]
        read_only_fields = fields