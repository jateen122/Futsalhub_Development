# backend/bookings/admin.py  — REPLACE ENTIRE FILE

from django.contrib import admin
from django.utils.html import format_html
from .models import Booking, LoyaltyRecord


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "user_email", "ground_name", "date",
        "start_time", "end_time", "total_price", "status_badge",
        "is_free_booking", "created_at",
    )
    list_filter   = ("status", "is_free_booking", "date", "ground")
    search_fields = ("user__email", "ground__name")
    ordering      = ("-created_at",)
    date_hierarchy = "date"

    @admin.display(description="Player")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name

    @admin.display(description="Status")
    def status_badge(self, obj):
        colours = {
            "pending"  : "#f59e0b",
            "confirmed": "#10b981",
            "cancelled": "#ef4444",
            "refunded" : "#6366f1",
        }
        colour = colours.get(obj.status, "#6b7280")
        return format_html(
            '<span style="color:{};font-weight:bold;">{}</span>',
            colour,
            obj.get_status_display(),
        )

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

    fieldsets = (
        ("Booking Info", {
            "fields": ("user", "ground", "date", "start_time", "end_time"),
        }),
        ("Pricing & Status", {
            "fields": ("total_price", "status", "is_free_booking"),
        }),
        ("Timestamps", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("total_price", "created_at")


@admin.register(LoyaltyRecord)
class LoyaltyRecordAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "user_email", "ground_name",
        "confirmed_count", "free_bookings_earned",
        "free_bookings_used", "free_available_badge", "updated_at",
    )
    list_filter   = ("ground",)
    search_fields = ("user__email", "ground__name")
    ordering      = ("-updated_at",)
    readonly_fields = ("updated_at",)

    @admin.display(description="User")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name

    @admin.display(description="Free Available")
    def free_available_badge(self, obj):
        count = obj.free_bookings_available
        if count > 0:
            return format_html(
                '<span style="color:#10b981;font-weight:bold;">🎁 {} available</span>',
                count,
            )
        return format_html('<span style="color:#9ca3af;">None</span>')

    fieldsets = (
        ("User & Ground", {
            "fields": ("user", "ground"),
        }),
        ("Loyalty Stats", {
            "fields": ("confirmed_count", "free_bookings_earned", "free_bookings_used"),
        }),
        ("Timestamps", {
            "fields": ("updated_at",),
        }),
    )