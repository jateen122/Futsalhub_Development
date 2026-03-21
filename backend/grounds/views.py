from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import Ground, Favorite
from .serializers import (
    GroundSerializer,
    GroundApprovalSerializer,
    PublicGroundSerializer,
    FavoriteSerializer,
)
from .permissions import IsOwnerRole, IsGroundOwner, IsAdminRole


# ─────────────────────────────────────────────────────────────────────────────
# GET  /api/grounds/          — public, approved only, advanced filtering
# ─────────────────────────────────────────────────────────────────────────────

class PublicGroundListView(generics.ListAPIView):
    serializer_class   = PublicGroundSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs     = Ground.objects.filter(is_approved=True).select_related("owner")
        params = self.request.query_params

        search = params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(location__icontains=search))

        location = params.get("location")
        if location:
            qs = qs.filter(location__icontains=location)

        min_price = params.get("min_price")
        if min_price:
            qs = qs.filter(price_per_hour__gte=min_price)

        max_price = params.get("max_price")
        if max_price:
            qs = qs.filter(price_per_hour__lte=max_price)

        facilities = params.get("facilities")
        if facilities:
            for kw in [f.strip() for f in facilities.split(",") if f.strip()]:
                qs = qs.filter(facilities__icontains=kw)

        ground_size = params.get("ground_size")
        if ground_size:
            qs = qs.filter(ground_size=ground_size)

        ground_type = params.get("ground_type")
        if ground_type:
            qs = qs.filter(ground_type__iexact=ground_type)

        return qs


# ─────────────────────────────────────────────────────────────────────────────
# GET  /api/grounds/admin/all/   — admin: all grounds
# ─────────────────────────────────────────────────────────────────────────────

class AdminGroundListView(generics.ListAPIView):
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        qs     = Ground.objects.all().select_related("owner")
        params = self.request.query_params

        status_filter = params.get("status")
        if status_filter == "approved": qs = qs.filter(is_approved=True)
        if status_filter == "pending":  qs = qs.filter(is_approved=False)

        ground_size = params.get("ground_size")
        if ground_size: qs = qs.filter(ground_size=ground_size)

        ground_type = params.get("ground_type")
        if ground_type: qs = qs.filter(ground_type__iexact=ground_type)

        return qs


# ─────────────────────────────────────────────────────────────────────────────
# GET  /api/grounds/admin/<id>/
# ─────────────────────────────────────────────────────────────────────────────

class AdminGroundDetailView(generics.RetrieveAPIView):
    queryset           = Ground.objects.all()
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/grounds/create/
# ─────────────────────────────────────────────────────────────────────────────

class CreateGroundView(generics.CreateAPIView):
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def perform_create(self, serializer):
        if Ground.objects.filter(owner=self.request.user).exists():
            raise ValidationError("You already have a ground registered.")
        serializer.save(owner=self.request.user, is_approved=False)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Ground created. Awaiting admin approval.", "ground": serializer.data},
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUT/PATCH /api/grounds/<id>/update/
# ─────────────────────────────────────────────────────────────────────────────

class UpdateGroundView(generics.UpdateAPIView):
    queryset           = Ground.objects.all()
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsGroundOwner]

    def update(self, request, *args, **kwargs):
        if "is_approved" in request.data:
            raise ValidationError("You cannot change approval status.")
        partial    = kwargs.pop("partial", False)
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"message": "Ground updated.", "ground": serializer.data})


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/grounds/<id>/delete/
# ─────────────────────────────────────────────────────────────────────────────

class DeleteGroundView(generics.DestroyAPIView):
    queryset           = Ground.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsGroundOwner]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "Ground deleted."}, status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/grounds/<id>/approve/
# ─────────────────────────────────────────────────────────────────────────────

class ApproveGroundView(generics.UpdateAPIView):
    queryset           = Ground.objects.all()
    serializer_class   = GroundApprovalSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    http_method_names  = ["patch"]

    def patch(self, request, *args, **kwargs):
        instance    = self.get_object()
        is_approved = request.data.get("is_approved")
        if is_approved is None:
            return Response({"detail": "Provide 'is_approved'."}, status=400)
        if isinstance(is_approved, str):
            is_approved = is_approved.lower() == "true"
        instance.is_approved = bool(is_approved)
        instance.save(update_fields=["is_approved"])
        action = "approved" if instance.is_approved else "disapproved"
        return Response({
            "message": f"Ground '{instance.name}' {action}.",
            "ground":  GroundApprovalSerializer(instance).data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/grounds/my/
# ─────────────────────────────────────────────────────────────────────────────

class OwnerGroundListView(generics.ListAPIView):
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def get_queryset(self):
        return Ground.objects.filter(owner=self.request.user).select_related("owner")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/grounds/favorites/toggle/
# ─────────────────────────────────────────────────────────────────────────────

class ToggleFavoriteView(APIView):
    """
    Toggle a ground as favorite for the logged-in user.
    Body: { "ground_id": <int> }
    Returns: { favorited: bool, message: str, ground_id: int, ground_name: str }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ground_id = request.data.get("ground_id")

        if not ground_id:
            return Response({"error": "ground_id is required."}, status=400)

        try:
            ground = Ground.objects.get(pk=ground_id)
        except Ground.DoesNotExist:
            return Response({"error": "Ground not found."}, status=404)

        favorite, created = Favorite.objects.get_or_create(
            user=request.user, ground=ground
        )

        if not created:
            favorite.delete()
            return Response({
                "favorited":   False,
                "message":     f"'{ground.name}' removed from favorites.",
                "ground_id":   ground.id,
                "ground_name": ground.name,
            }, status=200)

        return Response({
            "favorited":   True,
            "message":     f"'{ground.name}' added to favorites.",
            "ground_id":   ground.id,
            "ground_name": ground.name,
        }, status=201)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/grounds/favorites/
# ─────────────────────────────────────────────────────────────────────────────

class FavoriteListView(generics.ListAPIView):
    """
    Return all favorited grounds for the logged-in user.
    Response: { count: int, favorites: [...] }
    """
    serializer_class   = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Favorite.objects
            .filter(user=self.request.user)
            .select_related("ground", "ground__owner")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        queryset   = self.get_queryset()
        serializer = self.get_serializer(
            queryset, many=True,
            context={"request": request},
        )
        return Response({
            "count":     queryset.count(),
            "favorites": serializer.data,
        })
