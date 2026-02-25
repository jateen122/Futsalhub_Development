from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import Ground
from .serializers import (
    GroundSerializer,
    GroundApprovalSerializer,
    PublicGroundSerializer,
)
from .permissions import IsOwnerRole, IsGroundOwner, IsAdminRole


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/grounds/create/
# ─────────────────────────────────────────────────────────────────────────────

class CreateGroundView(generics.CreateAPIView):
    """
    Create a new ground listing.

    Access  : Authenticated users with role='owner' only.
    Behavior:
        - One owner can only create ONE ground.
        - request.user automatically assigned as owner.
        - Ground starts with is_approved=False.
    """

    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def perform_create(self, serializer):
        # 🚨 Restrict one ground per owner
        if Ground.objects.filter(owner=self.request.user).exists():
            raise ValidationError("You can only create one ground.")

        serializer.save(owner=self.request.user, is_approved=False)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {
                "message": "Ground created successfully. Awaiting admin approval.",
                "ground": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUT/PATCH /api/grounds/<id>/update/
# ─────────────────────────────────────────────────────────────────────────────

class UpdateGroundView(generics.UpdateAPIView):
    """
    Update an existing ground.

    Access   : Only the owner of the ground.
    Behavior :
        - Owner cannot change is_approved.
        - Supports PUT and PATCH.
    """

    queryset           = Ground.objects.all()
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsGroundOwner]

    def update(self, request, *args, **kwargs):
        if "is_approved" in request.data:
            raise ValidationError("You cannot change approval status.")

        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {
                "message": "Ground updated successfully.",
                "ground": serializer.data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/grounds/<id>/approve/
# ─────────────────────────────────────────────────────────────────────────────

class ApproveGroundView(generics.UpdateAPIView):
    """
    Approve or revoke approval of a ground.

    Access  : Admin role only.
    Behavior:
        - Accepts { "is_approved": true/false }
        - Only updates is_approved field.
    """

    queryset           = Ground.objects.all()
    serializer_class   = GroundApprovalSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    http_method_names  = ["patch"]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        is_approved = request.data.get("is_approved")

        if is_approved is None:
            return Response(
                {"detail": "Provide 'is_approved' field (true or false)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.is_approved = bool(is_approved)
        instance.save(update_fields=["is_approved"])

        action = "approved" if instance.is_approved else "disapproved"

        return Response(
            {
                "message": f"Ground '{instance.name}' has been {action}.",
                "ground": GroundApprovalSerializer(instance).data,
            }
        )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/grounds/
# ─────────────────────────────────────────────────────────────────────────────

class PublicGroundListView(generics.ListAPIView):
    """
    Public listing of approved grounds.

    Access    : Anyone.
    Filtering :
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
    Owner sees their own ground (including unapproved).

    Access: Authenticated owner only.
    """

    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def get_queryset(self):
        return Ground.objects.filter(owner=self.request.user).select_related("owner")