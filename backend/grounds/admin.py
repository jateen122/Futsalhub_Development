# backend/grounds/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Ground, Favorite, PeakPricingRule


@admin.register(Ground)
class GroundAdmin(admin.ModelAdmin):
    list_display  = ("name", "owner_email", "location", "ground_size",
                      "ground_type", "price_per_hour", "approval_badge", "created_at")
    list_filter   = ("is_approved", "ground_size", "ground_type", "created_at")
    search_fields = ("name", "location", "owner__email")
    ordering      = ("-created_at",)

    @admin.display(description="Owner")
    def owner_email(self, obj):
        return obj.owner.email

    @admin.display(description="Approved")
    def approval_badge(self, obj):
        if obj.is_approved:
            return format_html('<span style="color:green;font-weight:bold;">✔ Approved</span>')
        return format_html('<span style="color:orange;font-weight:bold;">⏳ Pending</span>')

    actions = ["approve_grounds", "disapprove_grounds"]

    @admin.action(description="✅ Approve selected grounds")
    def approve_grounds(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f"{updated} ground(s) approved.")

    @admin.action(description="❌ Disapprove selected grounds")
    def disapprove_grounds(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(request, f"{updated} ground(s) disapproved.")

    fieldsets = (
        ("Basic Info",       {"fields": ("owner", "name", "location", "description")}),
        ("Specifications",   {"fields": ("ground_size", "ground_type")}),
        ("Timing & Pricing", {"fields": ("opening_time", "closing_time", "price_per_hour")}),
        ("Details",          {"fields": ("facilities", "image")}),
        ("GPS",              {"fields": ("latitude", "longitude")}),
        ("Status",           {"fields": ("is_approved",)}),
    )
    readonly_fields = ("created_at",)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display  = ("user_email", "ground_name", "created_at")
    list_filter   = ("created_at",)
    search_fields = ("user__email", "ground__name")
    ordering      = ("-created_at",)
    readonly_fields = ("created_at",)

    @admin.display(description="User")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name


@admin.register(PeakPricingRule)
class PeakPricingRuleAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "ground_name", "label", "day_display",
        "hours_display", "price_per_hour", "is_active", "created_at",
    )
    list_filter   = ("is_active", "day_of_week", "ground")
    search_fields = ("ground__name", "label")
    ordering      = ("ground", "start_hour")

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.ground.name

    @admin.display(description="Day")
    def day_display(self, obj):
        return dict(PeakPricingRule.DAY_CHOICES).get(obj.day_of_week, "All Days")

    @admin.display(description="Hours")
    def hours_display(self, obj):
        return f"{obj.start_hour:02d}:00 – {obj.end_hour:02d}:00"

    fieldsets = (
        ("Ground",   {"fields": ("ground",)}),
        ("Schedule", {"fields": ("day_of_week", "start_hour", "end_hour")}),
        ("Pricing",  {"fields": ("price_per_hour", "label", "is_active")}),
    )