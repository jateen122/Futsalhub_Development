from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for FutsalHub.

    Replaces Django's default User model.
    Email is used as the authentication credential instead of username.
    """

    class Role(models.TextChoices):
        PLAYER = "player", "Player"
        OWNER  = "owner",  "Ground Owner"
        ADMIN  = "admin",  "Admin"

    # ── Core identity fields ──────────────────────────────────────────────────
    email     = models.EmailField(
        unique=True,
        verbose_name="Email address",
        help_text="Required. Used as the login credential.",
    )
    full_name = models.CharField(
        max_length=150,
        verbose_name="Full name",
    )
    phone     = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Phone number",
    )

    # ── Role & verification ───────────────────────────────────────────────────
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.PLAYER,
        verbose_name="Role",
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Verified",
        help_text=(
            "Players are auto-verified on registration. "
            "Ground owners require manual verification."
        ),
    )

    # ── Django permission / status flags ──────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Uncheck to deactivate the account without deleting it.",
    )
    is_staff = models.BooleanField(
        default=False,
        verbose_name="Staff status",
        help_text="Grants access to the Django admin site.",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Joined at")

    # ── Manager ───────────────────────────────────────────────────────────────
    objects = UserManager()

    # ── Auth configuration ────────────────────────────────────────────────────
    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["full_name"]   # asked by createsuperuser in addition to email

    class Meta:
        verbose_name        = "User"
        verbose_name_plural = "Users"
        ordering            = ["-created_at"]

    # ── Helpers ───────────────────────────────────────────────────────────────
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
