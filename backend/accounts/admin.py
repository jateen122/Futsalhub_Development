from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom admin configuration for the FutsalHub User model.
    """

    # ── List view ─────────────────────────────────────────────────────────────
    list_display  = (
        "email", "full_name", "role", "city",
        "is_verified", "is_active", "is_staff", "avatar_thumb", "created_at",
    )
    list_filter   = ("role", "is_verified", "is_active", "is_staff")
    search_fields = ("email", "full_name", "phone", "city")
    ordering      = ("-created_at",)

    # ── Thumbnail helper ──────────────────────────────────────────────────────
    @admin.display(description="Avatar")
    def avatar_thumb(self, obj):
        if obj.profile_image:
            return format_html(
                '<img src="{}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />',
                obj.profile_image.url,
            )
        return "—"

    # ── Bulk actions ──────────────────────────────────────────────────────────
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
        (None, {
            "fields": ("email", "password"),
        }),
        (_("Personal info"), {
            "fields": ("full_name", "phone", "city", "profile_image"),
        }),
        (_("FutsalHub"), {
            "fields": ("role", "is_verified"),
        }),
        (_("Permissions"), {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            "classes": ("collapse",),
        }),
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
            "fields": (
                "email", "full_name", "phone", "city",
                "role", "profile_image", "password1", "password2",
            ),
        }),
    )
