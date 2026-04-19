from django.contrib import admin
from django.utils.html import format_html
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "recipient_email", "notification_type",
        "short_message", "is_read", "created_at",
    )
    # ✅ removed read_badge with format_html — show raw is_read field
    list_filter   = ("notification_type", "is_read")
    search_fields = ("user__email", "message")
    ordering      = ("-created_at",)
    # ✅ NO date_hierarchy

    @admin.display(description="Recipient")
    def recipient_email(self, obj):
        return obj.user.email if obj.user else "—"

    @admin.display(description="Message")
    def short_message(self, obj):
        if obj.message and len(obj.message) > 80:
            return obj.message[:80] + "..."
        return obj.message or "—"

    actions = ["mark_as_read", "mark_as_unread"]

    @admin.action(description="Mark selected as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} notification(s) marked as read.")

    @admin.action(description="Mark selected as unread")
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} notification(s) marked as unread.")

    fieldsets = (
        ("Recipient",  {"fields": ("user",)}),
        ("Content",    {"fields": ("notification_type", "message")}),
        ("Status",     {"fields": ("is_read",)}),
        ("Timestamps", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("created_at",)