from django.contrib import admin
from django.utils.html import format_html
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Booking model.

    Features:
      • Color-coded status badge in list view.
      • Filter by status, date, and ground.
      • Bulk confirm / cancel actions.
      • Search by player email or ground name.
    """

    # ── List view ─────────────────────────────────────────────────────────────
    list_display  = (
        "id", "user_email", "ground_name", "date",
        "start_time", "end_time", "total_price", "status_badge", "created_at",
    )
    list_filter   = ("status", "date", "ground")
    search_fields = ("user__email", "ground__name")
    ordering      = ("-created_at",)
    date_hierarchy = "date"

    # ── Custom columns ────────────────────────────────────────────────────────

    @admin.display(description="Player")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name

    @admin.display(description="Status")
    def status_badge(self, obj):
        colours = {
            "pending"  : "#f59e0b",   # amber
            "confirmed": "#10b981",   # green
            "cancelled": "#ef4444",   # red
            "refunded" : "#6366f1",   # indigo
        }
        colour = colours.get(obj.status, "#6b7280")
        return format_html(
            '<span style="color:{};font-weight:bold;">{}</span>',
            colour,
            obj.get_status_display(),
        )

    # ── Bulk actions ──────────────────────────────────────────────────────────
    actions = ["confirm_bookings", "cancel_bookings"]

    @admin.action(description="✅ Confirm selected bookings")
    def confirm_bookings(self, request, queryset):
        updated = queryset.filter(status="pending").update(status="confirmed")
        self.message_user(request, f"{updated} booking(s) confirmed.")

    @admin.action(description="❌ Cancel selected bookings")
    def cancel_bookings(self, request, queryset):
        updated = queryset.exclude(
            status__in=["cancelled", "refunded"]
        ).update(status="cancelled")
        self.message_user(request, f"{updated} booking(s) cancelled.")

    # ── Detail view ───────────────────────────────────────────────────────────
    fieldsets = (
        ("Booking Info", {
            "fields": ("user", "ground", "date", "start_time", "end_time"),
        }),
        ("Pricing & Status", {
            "fields": ("total_price", "status"),
        }),
        ("Timestamps", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("total_price", "created_at")
