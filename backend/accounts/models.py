import hashlib
import secrets
import string
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


# ─── OTP Configuration ────────────────────────────────────────────────────────
OTP_EXPIRY_MINUTES = 5      # OTP valid for 5 minutes
OTP_COOLDOWN_SECONDS = 60   # Minimum gap between resend requests
OTP_MAX_ATTEMPTS = 5        # Block after 5 failed attempts


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for FutsalHub.
    Email is used as the authentication credential instead of username.
    """

    class Role(models.TextChoices):
        PLAYER = "player", "Player"
        OWNER  = "owner",  "Ground Owner"
        ADMIN  = "admin",  "Admin"

    # ── Core identity fields ──────────────────────────────────────────────────
    email = models.EmailField(
        unique=True,
        verbose_name="Email address",
        help_text="Required. Used as the login credential.",
    )
    full_name = models.CharField(max_length=150, verbose_name="Full name")
    phone = models.CharField(max_length=20, blank=True, default="0000000000")
    profile_image = models.ImageField(upload_to="profiles/", blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, default="")

    # ── Role & verification ───────────────────────────────────────────────────
    role = models.CharField(
        max_length=10, choices=Role.choices, default=Role.PLAYER
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="True once the user verifies their email via OTP.",
    )

    # ── Django flags ──────────────────────────────────────────────────────────
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"
        ordering            = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def is_player(self):
        return self.role == self.Role.PLAYER

    @property
    def is_owner(self):
        return self.role == self.Role.OWNER

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN


# ─── OTP Model ────────────────────────────────────────────────────────────────

class OTPVerification(models.Model):
    """
    Stores a hashed OTP for email verification.

    Security:
      - OTP is hashed with SHA-256 before storage (never stored in plain text).
      - Expires after OTP_EXPIRY_MINUTES minutes.
      - Tracks failed attempts to prevent brute-force.
      - Tracks last sent time to enforce rate limiting.
    """

    user         = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="otp_verification"
    )
    otp_hash     = models.CharField(max_length=64)   # SHA-256 hex digest
    created_at   = models.DateTimeField(auto_now_add=True)
    expires_at   = models.DateTimeField()
    attempts     = models.PositiveSmallIntegerField(default=0)
    is_used      = models.BooleanField(default=False)
    last_sent_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name        = "OTP Verification"
        verbose_name_plural = "OTP Verifications"

    def __str__(self):
        return f"OTP for {self.user.email} | expires {self.expires_at}"

    # ── Class-level helpers ───────────────────────────────────────────────────

    @staticmethod
    def generate_otp() -> str:
        """Generate a cryptographically secure 6-digit OTP."""
        return "".join(secrets.choice(string.digits) for _ in range(6))

    @staticmethod
    def hash_otp(otp: str) -> str:
        """SHA-256 hash the OTP before storing."""
        return hashlib.sha256(otp.encode()).hexdigest()

    @classmethod
    def create_for_user(cls, user: User) -> tuple["OTPVerification", str]:
        """
        Create (or replace) an OTP record for a user.
        Returns (otp_record, plain_otp).
        """
        plain_otp = cls.generate_otp()
        otp_hash  = cls.hash_otp(plain_otp)
        expires   = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

        record, _ = cls.objects.update_or_create(
            user=user,
            defaults={
                "otp_hash":     otp_hash,
                "expires_at":   expires,
                "attempts":     0,
                "is_used":      False,
                "last_sent_at": timezone.now(),
            },
        )
        return record, plain_otp

    # ── Instance helpers ──────────────────────────────────────────────────────

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def is_on_cooldown(self) -> bool:
        """True if a resend was requested too recently."""
        elapsed = (timezone.now() - self.last_sent_at).total_seconds()
        return elapsed < OTP_COOLDOWN_SECONDS

    def cooldown_seconds_left(self) -> int:
        elapsed = (timezone.now() - self.last_sent_at).total_seconds()
        return max(0, int(OTP_COOLDOWN_SECONDS - elapsed))

    def is_max_attempts_reached(self) -> bool:
        return self.attempts >= OTP_MAX_ATTEMPTS

    def verify(self, plain_otp: str) -> bool:
        """
        Verify the plain OTP against the stored hash.
        Increments attempt counter. Returns True on success.
        """
        self.attempts += 1
        self.save(update_fields=["attempts"])

        if self.hash_otp(plain_otp) == self.otp_hash:
            self.is_used = True
            self.save(update_fields=["is_used"])
            return True
        return False