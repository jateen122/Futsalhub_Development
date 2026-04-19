from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "user_email", "ground_name", "amount",
        "payment_method", "status", "transaction_id", "created_at",
    )
    # ✅ removed status_badge with format_html — show raw status
    list_filter   = ("status", "payment_method")
    search_fields = ("user__email", "transaction_id", "pidx")
    ordering      = ("-created_at",)
    # ✅ NO date_hierarchy
    readonly_fields = (
        "pidx", "purchase_order_id", "transaction_id",
        "khalti_status", "created_at", "updated_at",
    )

    @admin.display(description="User")
    def user_email(self, obj):
        return obj.user.email if obj.user else "—"

    @admin.display(description="Ground")
    def ground_name(self, obj):
        try:
            if obj.booking and obj.booking.ground:
                return obj.booking.ground.name
        except Exception:
            pass
        extra = obj.extra_data or {}
        ground_id = extra.get("ground_id")
        if ground_id:
            try:
                from grounds.models import Ground
                return Ground.objects.get(pk=ground_id).name
            except Exception:
                pass
        return "—"

    fieldsets = (
        ("Payment Info", {
            "fields": (
                "user", "booking", "amount",
                "payment_method", "status",
            ),
        }),
        ("Khalti Details", {
            "fields": (
                "pidx", "purchase_order_id",
                "transaction_id", "khalti_status",
            ),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )