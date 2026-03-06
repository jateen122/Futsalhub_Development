from django.contrib import admin
from django.utils.html import format_html
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin panel for Notification model.

    Features:
      • Color-coded read/unread badge.
      • Filter by type and read status.
      • Bulk mark-as-read action.
      • Search by user email or message content.
    """

    # ── List view ─────────────────────────────────────────────────────────────
    list_display  = (
        "id", "recipient_email", "notification_type",
        "short_message", "read_badge", "created_at",
    )
    list_filter   = ("notification_type", "is_read", "created_at")
    search_fields = ("user__email", "message")
    ordering      = ("-created_at",)
    date_hierarchy = "created_at"

    # ── Custom columns ────────────────────────────────────────────────────────

    @admin.display(description="Recipient")
    def recipient_email(self, obj):
        return obj.user.email

    @admin.display(description="Message")
    def short_message(self, obj):
        return obj.message[:80] + "..." if len(obj.message) > 80 else obj.message

    @admin.display(description="Status")
    def read_badge(self, obj):
        if obj.is_read:
            return format_html(
                '<span style="color:#10b981;font-weight:bold;">✔ Read</span>'
            )
        return format_html(
            '<span style="color:#f59e0b;font-weight:bold;">● Unread</span>'
        )

    # ── Bulk actions ──────────────────────────────────────────────────────────
    actions = ["mark_as_read", "mark_as_unread"]

    @admin.action(description="✅ Mark selected as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} notification(s) marked as read.")

    @admin.action(description="🔔 Mark selected as unread")
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} notification(s) marked as unread.")

    # ── Detail view ───────────────────────────────────────────────────────────
    fieldsets = (
        ("Recipient", {
            "fields": ("user",),
        }),
        ("Content", {
            "fields": ("notification_type", "message"),
        }),
        ("Status", {
            "fields": ("is_read",),
        }),
        ("Timestamps", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("created_at",)
