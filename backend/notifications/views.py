from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer, MarkReadSerializer


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/notifications/
# ─────────────────────────────────────────────────────────────────────────────

class UserNotificationsView(generics.ListAPIView):
    """
    Return all notifications for the currently authenticated user.

    Access    : Any authenticated user.
    Ordering  : Newest first (-created_at).
    Filtering : ?is_read=true|false  to filter by read status.
    """

    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)

        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")

        return qs

    def list(self, request, *args, **kwargs):
        queryset     = self.get_queryset()
        serializer   = self.get_serializer(queryset, many=True)
        unread_count = queryset.filter(is_read=False).count()

        return Response({
            "unread_count"  : unread_count,
            "notifications" : serializer.data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/notifications/<id>/read/
# ─────────────────────────────────────────────────────────────────────────────

class MarkNotificationReadView(APIView):
    """
    Mark a single notification as read.

    Access   : Authenticated user who owns the notification.
    Behavior : Sets is_read=True. Idempotent — safe to call multiple times.
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk   = pk,
                user = request.user,        # users can only mark their own
            )
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response(
            {
                "message"      : "Notification marked as read.",
                "notification" : NotificationSerializer(notification).data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/notifications/read-all/
# ─────────────────────────────────────────────────────────────────────────────

class MarkAllNotificationsReadView(APIView):
    """
    Mark ALL unread notifications for the logged-in user as read in one call.

    Access   : Any authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        updated = Notification.objects.filter(
            user    = request.user,
            is_read = False,
        ).update(is_read=True)

        return Response(
            {"message": f"{updated} notification(s) marked as read."}
        )
