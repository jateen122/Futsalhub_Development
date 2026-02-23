from django.contrib import admin
from django.utils.html import format_html
from .models import Ground


@admin.register(Ground)
class GroundAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Ground model.

    Highlights:
      • Image thumbnail in list view.
      • One-click approve / disapprove bulk actions.
      • Filter sidebar for quick approval-status triage.
    """

    # ── List view ─────────────────────────────────────────────────────────────
    list_display  = (
        "name", "owner_email", "location", "price_per_hour",
        "opening_time", "closing_time", "approval_badge", "created_at",
    )
    list_filter   = ("is_approved", "created_at")
    search_fields = ("name", "location", "owner__email")
    ordering      = ("-created_at",)
    date_hierarchy = "created_at"

    # ── Custom list columns ───────────────────────────────────────────────────

    @admin.display(description="Owner email")
    def owner_email(self, obj):
        return obj.owner.email

    @admin.display(description="Approved", boolean=False)
    def approval_badge(self, obj):
        if obj.is_approved:
            return format_html('<span style="color:green;font-weight:bold;">✔ Approved</span>')
        return format_html('<span style="color:red;font-weight:bold;">✘ Pending</span>')

    # ── Bulk actions ──────────────────────────────────────────────────────────
    actions = ["approve_grounds", "disapprove_grounds"]

    @admin.action(description="✅ Approve selected grounds")
    def approve_grounds(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f"{updated} ground(s) approved successfully.")

    @admin.action(description="❌ Disapprove selected grounds")
    def disapprove_grounds(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(request, f"{updated} ground(s) disapproved.")

    # ── Detail / edit view ────────────────────────────────────────────────────
    fieldsets = (
        ("Basic Info", {
            "fields": ("owner", "name", "location", "description"),
        }),
        ("Timing & Pricing", {
            "fields": ("opening_time", "closing_time", "price_per_hour"),
        }),
        ("Details", {
            "fields": ("facilities", "image"),
        }),
        ("Status", {
            "fields": ("is_approved",),
        }),
    )
    readonly_fields = ("created_at",)
