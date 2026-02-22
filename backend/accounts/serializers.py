from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new-user registration.

    Business rules applied here:
      • role = PLAYER  →  is_verified = True  (auto-verified)
      • role = OWNER   →  is_verified = False (requires manual verification)
      • Password is validated against Django's AUTH_PASSWORD_VALIDATORS and
        stored as a bcrypt hash (via set_password).
    """

    password  = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        validators=[validate_password],
        help_text="Must meet Django's password strength requirements.",
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        label="Confirm password",
    )

    class Meta:
        model  = User
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

    # ── Validation ────────────────────────────────────────────────────────────

    def validate_email(self, value):
        """Normalise and check uniqueness."""
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value):
        """Prevent self-assigning the ADMIN role via the public API."""
        if value == User.Role.ADMIN:
            raise serializers.ValidationError(
                "You cannot register with the 'admin' role."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    # ── Creation ──────────────────────────────────────────────────────────────

    def create(self, validated_data):
        role = validated_data.get("role", User.Role.PLAYER)

        # Core verification rule
        is_verified = role == User.Role.PLAYER

        user = User.objects.create_user(
            email       = validated_data["email"],
            full_name   = validated_data["full_name"],
            password    = validated_data["password"],
            phone       = validated_data.get("phone", ""),
            role        = role,
            is_verified = is_verified,
        )
        return user


# ─────────────────────────────────────────────────────────────────────────────
# Profile (read / update)
# ─────────────────────────────────────────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    """
    Read / partial-update for the authenticated user's own profile.

    Sensitive fields (password, is_staff, is_superuser) are excluded.
    Role and is_verified are read-only so they cannot be self-modified.
    """

    class Meta:
        model  = User
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
            "email",      # email changes go through a dedicated endpoint
            "role",       # role changes are an admin action
            "is_verified",
            "is_active",
            "created_at",
        ]
