from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin configuration for the FutsalHub User model.

    Key differences from Django's default UserAdmin:
      • Ordering and search are email-based (no username).
      • Extra fieldset exposes role, phone, and verification status.
      • List view highlights unverified ground owners for quick action.
    """

    # ── List view ─────────────────────────────────────────────────────────────
    list_display  = ("email", "full_name", "role", "is_verified", "is_active", "is_staff", "created_at")
    list_filter   = ("role", "is_verified", "is_active", "is_staff")
    search_fields = ("email", "full_name", "phone")
    ordering      = ("-created_at",)

    # ── Actions ───────────────────────────────────────────────────────────────
    actions = ["verify_owners", "deactivate_users"]

    @admin.action(description="✅ Verify selected ground owners")
    def verify_owners(self, request, queryset):
        updated = queryset.filter(role=User.Role.OWNER).update(is_verified=True)
        self.message_user(request, f"{updated} owner(s) marked as verified.")

    @admin.action(description="🚫 Deactivate selected users")
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} user(s) deactivated.")

    # ── Detail / edit view ────────────────────────────────────────────────────
    fieldsets = (
        # Login credentials
        (None, {
            "fields": ("email", "password"),
        }),
        # Personal info
        (_("Personal info"), {
            "fields": ("full_name", "phone"),
        }),
        # FutsalHub-specific
        (_("FutsalHub"), {
            "fields": ("role", "is_verified"),
        }),
        # Permissions
        (_("Permissions"), {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            "classes": ("collapse",),
        }),
        # Read-only timestamps
        (_("Important dates"), {
            "fields": ("last_login", "created_at"),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("created_at", "last_login")

    # ── Add-user form ─────────────────────────────────────────────────────────
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "phone", "role", "password1", "password2"),
        }),
    )
