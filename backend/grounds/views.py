from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Ground
from .serializers import GroundSerializer, GroundApprovalSerializer, PublicGroundSerializer
from .permissions import IsOwnerRole, IsGroundOwner, IsAdminRole


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/grounds/create/
# ─────────────────────────────────────────────────────────────────────────────

class CreateGroundView(generics.CreateAPIView):
    """
    Create a new ground listing.

    Access  : Authenticated users with role='owner' only.
    Behavior: request.user is automatically saved as the owner.
              The ground starts with is_approved=False and will not appear
              in the public listing until an admin approves it.
    """

    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "message": "Ground created successfully. Awaiting admin approval.",
                "ground" : serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUT/PATCH /api/grounds/<id>/update/
# ─────────────────────────────────────────────────────────────────────────────

class UpdateGroundView(generics.UpdateAPIView):
    """
    Update an existing ground.

    Access      : Authenticated users with role='owner' who own this ground.
    Behavior    : Supports both PUT (full) and PATCH (partial) updates.
                  is_approved cannot be changed here — use the approve endpoint.
    """

    queryset           = Ground.objects.all()
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsGroundOwner]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()           # triggers has_object_permission
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {
                "message": "Ground updated successfully.",
                "ground" : serializer.data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/grounds/<id>/approve/
# ─────────────────────────────────────────────────────────────────────────────

class ApproveGroundView(generics.UpdateAPIView):
    """
    Approve (or revoke approval of) a ground.

    Access  : Admin role only.
    Behavior: Accepts { "is_approved": true/false }.
              Uses a minimal serializer so only is_approved can be changed.
    """

    queryset           = Ground.objects.all()
    serializer_class   = GroundApprovalSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    http_method_names  = ["patch"]          # only PATCH, not PUT

    def patch(self, request, *args, **kwargs):
        instance   = self.get_object()
        is_approved = request.data.get("is_approved")

        if is_approved is None:
            return Response(
                {"detail": "Provide 'is_approved' field (true or false)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.is_approved = bool(is_approved)
        instance.save(update_fields=["is_approved"])

        action  = "approved" if instance.is_approved else "disapproved"
        return Response(
            {
                "message": f"Ground '{instance.name}' has been {action}.",
                "ground" : GroundApprovalSerializer(instance).data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/grounds/
# ─────────────────────────────────────────────────────────────────────────────

class PublicGroundListView(generics.ListAPIView):
    """
    Public listing of all approved grounds.

    Access    : Anyone (no authentication required).
    Filtering : Optional query params —
                  ?location=kathmandu
                  ?min_price=500
                  ?max_price=2000
    """

    serializer_class   = PublicGroundSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Ground.objects.filter(is_approved=True).select_related("owner")

        location  = self.request.query_params.get("location")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if location:
            qs = qs.filter(location__icontains=location)
        if min_price:
            qs = qs.filter(price_per_hour__gte=min_price)
        if max_price:
            qs = qs.filter(price_per_hour__lte=max_price)

        return qs


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/grounds/my/
# ─────────────────────────────────────────────────────────────────────────────

class OwnerGroundListView(generics.ListAPIView):
    """
    Returns all grounds belonging to the authenticated owner,
    including unapproved ones.

    Access: Authenticated users with role='owner'.
    """

    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def get_queryset(self):
        return Ground.objects.filter(owner=self.request.user).select_related("owner")
