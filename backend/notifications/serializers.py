from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for reading notifications.
    All fields are read-only — notifications are system-generated,
    users can only mark them as read via the dedicated endpoint.
    """

    notification_type_display = serializers.CharField(
        source="get_notification_type_display",
        read_only=True,
    )

    class Meta:
        model  = Notification
        fields = [
            "id",
            "notification_type",
            "notification_type_display",
            "message",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields


class MarkReadSerializer(serializers.ModelSerializer):
    """
    Minimal serializer used only by the mark-as-read endpoint.
    """

    class Meta:
        model            = Notification
        fields           = ["id", "is_read"]
        read_only_fields = ["id"]
