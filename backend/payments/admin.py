from django.contrib import admin
from django.utils.html import format_html
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = (
        "id", "user_email", "ground_name", "amount",
        "payment_method", "status_badge", "transaction_id", "created_at",
    )
    list_filter   = ("status", "payment_method", "created_at")
    search_fields = ("user__email", "booking__ground__name", "transaction_id", "pidx")
    ordering      = ("-created_at",)
    readonly_fields = (
        "pidx", "purchase_order_id", "transaction_id",
        "khalti_status", "created_at", "updated_at",
    )

    @admin.display(description="User")
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description="Ground")
    def ground_name(self, obj):
        return obj.booking.ground.name

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            "success":  "#10b981",
            "pending":  "#f59e0b",
            "failed":   "#ef4444",
            "refunded": "#6366f1",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="color:{};font-weight:bold;">{}</span>',
            color, obj.get_status_display(),
        )

    fieldsets = (
        ("Payment Info", {
            "fields": ("user", "booking", "amount", "payment_method", "status"),
        }),
        ("Khalti Details", {
            "fields": ("pidx", "purchase_order_id", "transaction_id", "khalti_status"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
