from django.contrib import admin
from django.utils.html import format_html
from .models import Booking, LoyaltyRecord, ReschedulingToken


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display   = (
        "id", "user_email", "ground_name", "date",
        "start_time", "end_time", "total_price",
        "status", "is_free_booking", "created_at",
    )
    # ✅ removed status_badge with format_html — just show raw status field
    list_filter    = ("status", "is_free_booking", "date", "ground")
    search_fields  = ("user__email", "ground__name")
    ordering       = ("-created_at",)
    # ✅ NO date_hierarchy

    @admin.display(description="Player")
    def user_email(self, obj):
        return obj.user.email if obj.user else "—"

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name if obj.ground else "—"

    actions = ["confirm_bookings", "cancel_bookings"]

    @admin.action(description="Confirm selected bookings")
    def confirm_bookings(self, request, queryset):
        updated = queryset.filter(status="pending").update(status="confirmed")
        self.message_user(request, f"{updated} booking(s) confirmed.")

    @admin.action(description="Cancel selected bookings")
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
        "free_bookings_used", "updated_at",
    )
    list_filter   = ("ground",)
    search_fields = ("user__email", "ground__name")
    ordering      = ("-updated_at",)
    readonly_fields = ("updated_at",)
    # ✅ removed free_available_badge with format_html

    @admin.display(description="User")
    def user_email(self, obj):
        return obj.user.email if obj.user else "—"

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name if obj.ground else "—"

    fieldsets = (
        ("User & Ground",  {"fields": ("user", "ground")}),
        ("Loyalty Stats",  {
            "fields": (
                "confirmed_count",
                "free_bookings_earned",
                "free_bookings_used",
            ),
        }),
        ("Timestamps",     {"fields": ("updated_at",)}),
    )


@admin.register(ReschedulingToken)
class ReschedulingTokenAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "short_token", "user_email", "ground_name",
        "original_price", "original_date",
        "is_used", "created_at", "expires_at",
    )
    # ✅ removed status_badge with format_html
    list_filter   = ("is_used", "original_ground")
    search_fields = ("user__email", "original_ground__name", "token")
    ordering      = ("-created_at",)
    readonly_fields = (
        "token", "user", "original_ground", "original_date",
        "original_start_time", "original_end_time", "original_price",
        "created_at", "expires_at",
    )

    @admin.display(description="Token")
    def short_token(self, obj):
        return str(obj.token)[:8] + "..."

    @admin.display(description="User")
    def user_email(self, obj):
        return obj.user.email if obj.user else "—"

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.original_ground.name if obj.original_ground else "—"

    fieldsets = (
        ("Token Info", {"fields": ("token", "user", "is_used")}),
        ("Original Booking", {
            "fields": (
                "original_ground", "original_date",
                "original_start_time", "original_end_time",
                "original_price",
            ),
        }),
        ("Validity", {"fields": ("created_at", "expires_at")}),
    )