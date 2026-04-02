# backend/grounds/views.py
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import Ground, Favorite, PeakPricingRule, BlockedSlot
from .serializers import (
    GroundSerializer,
    GroundApprovalSerializer,
    PublicGroundSerializer,
    FavoriteSerializer,
    PeakPricingRuleSerializer,
    BlockedSlotSerializer,
)
from .permissions import IsOwnerRole, IsGroundOwner, IsAdminRole


# ─────────────────────────────────────────────────────────────────────────────
# GET  /api/grounds/
# ─────────────────────────────────────────────────────────────────────────────

class PublicGroundListView(generics.ListAPIView):
    serializer_class   = PublicGroundSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs     = Ground.objects.filter(is_approved=True).select_related("owner").prefetch_related(
            "peak_pricing_rules", "blocked_slots"
        )
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
# GET  /api/grounds/admin/all/
# ─────────────────────────────────────────────────────────────────────────────

class AdminGroundListView(generics.ListAPIView):
    serializer_class   = GroundSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        qs     = Ground.objects.all().select_related("owner").prefetch_related(
            "peak_pricing_rules", "blocked_slots"
        )
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
    queryset           = Ground.objects.all().prefetch_related("peak_pricing_rules", "blocked_slots")
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
        return Ground.objects.filter(
            owner=self.request.user
        ).select_related("owner").prefetch_related("peak_pricing_rules", "blocked_slots")


# ─────────────────────────────────────────────────────────────────────────────
# Favorites
# ─────────────────────────────────────────────────────────────────────────────

class ToggleFavoriteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ground_id = request.data.get("ground_id")
        if not ground_id:
            return Response({"error": "ground_id is required."}, status=400)
        try:
            ground = Ground.objects.get(pk=ground_id)
        except Ground.DoesNotExist:
            return Response({"error": "Ground not found."}, status=404)

        favorite, created = Favorite.objects.get_or_create(user=request.user, ground=ground)
        if not created:
            favorite.delete()
            return Response({"favorited": False, "message": f"'{ground.name}' removed from favorites.",
                             "ground_id": ground.id, "ground_name": ground.name}, status=200)
        return Response({"favorited": True, "message": f"'{ground.name}' added to favorites.",
                         "ground_id": ground.id, "ground_name": ground.name}, status=201)


class FavoriteListView(generics.ListAPIView):
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
        serializer = self.get_serializer(queryset, many=True, context={"request": request})
        return Response({"count": queryset.count(), "favorites": serializer.data})


# ─────────────────────────────────────────────────────────────────────────────
# Peak Pricing
# ─────────────────────────────────────────────────────────────────────────────

class PeakPricingRuleListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def _get_ground(self, ground_id, user):
        try:
            ground = Ground.objects.get(pk=ground_id)
        except Ground.DoesNotExist:
            return None, Response({"detail": "Ground not found."}, status=404)
        if ground.owner != user:
            return None, Response({"detail": "You do not own this ground."}, status=403)
        return ground, None

    def get(self, request, ground_id):
        ground, err = self._get_ground(ground_id, request.user)
        if err:
            return err
        rules = PeakPricingRule.objects.filter(ground=ground)
        serializer = PeakPricingRuleSerializer(rules, many=True)
        return Response({
            "ground_id": ground.id, "ground_name": ground.name,
            "base_price": str(ground.price_per_hour), "rules": serializer.data,
        })

    def post(self, request, ground_id):
        ground, err = self._get_ground(ground_id, request.user)
        if err:
            return err
        serializer = PeakPricingRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ground=ground)
        return Response(
            {"message": "Pricing rule created.", "rule": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class PeakPricingRuleDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def _get_rule(self, ground_id, pk, user):
        try:
            rule = PeakPricingRule.objects.select_related("ground").get(pk=pk, ground_id=ground_id)
        except PeakPricingRule.DoesNotExist:
            return None, Response({"detail": "Rule not found."}, status=404)
        if rule.ground.owner != user:
            return None, Response({"detail": "You do not own this ground."}, status=403)
        return rule, None

    def get(self, request, ground_id, pk):
        rule, err = self._get_rule(ground_id, pk, request.user)
        if err: return err
        return Response(PeakPricingRuleSerializer(rule).data)

    def patch(self, request, ground_id, pk):
        rule, err = self._get_rule(ground_id, pk, request.user)
        if err: return err
        serializer = PeakPricingRuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Rule updated.", "rule": serializer.data})

    def delete(self, request, ground_id, pk):
        rule, err = self._get_rule(ground_id, pk, request.user)
        if err: return err
        rule.delete()
        return Response({"message": "Rule deleted."}, status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# Slot Pricing (public)
# ─────────────────────────────────────────────────────────────────────────────

class SlotPricingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, ground_id):
        try:
            ground = Ground.objects.get(pk=ground_id, is_approved=True)
        except Ground.DoesNotExist:
            return Response({"detail": "Ground not found."}, status=404)

        date_str = request.query_params.get("date")
        hour_str = request.query_params.get("hour")

        if not date_str or hour_str is None:
            return Response({"detail": "date and hour query params are required."}, status=400)

        try:
            from datetime import date as date_cls
            booking_date = date_cls.fromisoformat(date_str)
            hour = int(hour_str)
        except (ValueError, TypeError):
            return Response({"detail": "Invalid date or hour format."}, status=400)

        # Check if slot is blocked
        is_blocked, block_reason = ground.is_slot_blocked(booking_date, hour)

        effective_price = ground.get_price_for_slot(booking_date, hour)

        day_of_week = booking_date.weekday()
        rules = ground.peak_pricing_rules.filter(is_active=True)
        matched_rule = None
        for rule in rules:
            day_match  = (rule.day_of_week == -1 or rule.day_of_week == day_of_week)
            hour_match = rule.start_hour <= hour < rule.end_hour
            if day_match and hour_match:
                matched_rule = rule
                break

        return Response({
            "ground_id":       ground.id,
            "ground_name":     ground.name,
            "date":            date_str,
            "hour":            hour,
            "base_price":      str(ground.price_per_hour),
            "effective_price": str(effective_price),
            "is_peak":         matched_rule is not None,
            "peak_rule":       PeakPricingRuleSerializer(matched_rule).data if matched_rule else None,
            "is_blocked":      is_blocked,
            "block_reason":    block_reason,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Blocked Slots — Owner CRUD
# GET/POST /api/grounds/<ground_id>/blocks/
# ─────────────────────────────────────────────────────────────────────────────

class BlockedSlotListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def _get_ground(self, ground_id, user):
        try:
            ground = Ground.objects.get(pk=ground_id)
        except Ground.DoesNotExist:
            return None, Response({"detail": "Ground not found."}, status=404)
        if ground.owner != user:
            return None, Response({"detail": "You do not own this ground."}, status=403)
        return ground, None

    def get(self, request, ground_id):
        ground, err = self._get_ground(ground_id, request.user)
        if err:
            return err
        blocks = BlockedSlot.objects.filter(ground=ground)
        serializer = BlockedSlotSerializer(blocks, many=True)
        return Response({
            "ground_id":   ground.id,
            "ground_name": ground.name,
            "blocks":      serializer.data,
        })

    def post(self, request, ground_id):
        ground, err = self._get_ground(ground_id, request.user)
        if err:
            return err
        serializer = BlockedSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ground=ground)
        return Response(
            {"message": "Blocked slot created.", "block": serializer.data},
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Blocked Slots — Owner detail
# GET/PATCH/DELETE /api/grounds/<ground_id>/blocks/<pk>/
# ─────────────────────────────────────────────────────────────────────────────

class BlockedSlotDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerRole]

    def _get_block(self, ground_id, pk, user):
        try:
            block = BlockedSlot.objects.select_related("ground").get(pk=pk, ground_id=ground_id)
        except BlockedSlot.DoesNotExist:
            return None, Response({"detail": "Blocked slot not found."}, status=404)
        if block.ground.owner != user:
            return None, Response({"detail": "You do not own this ground."}, status=403)
        return block, None

    def get(self, request, ground_id, pk):
        block, err = self._get_block(ground_id, pk, request.user)
        if err: return err
        return Response(BlockedSlotSerializer(block).data)

    def patch(self, request, ground_id, pk):
        block, err = self._get_block(ground_id, pk, request.user)
        if err: return err
        serializer = BlockedSlotSerializer(block, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Block updated.", "block": serializer.data})

    def delete(self, request, ground_id, pk):
        block, err = self._get_block(ground_id, pk, request.user)
        if err: return err
        block.delete()
        return Response({"message": "Block deleted."}, status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# Public blocked slots — used by booking page
# GET /api/grounds/<ground_id>/blocked-slots/?date=YYYY-MM-DD
# ─────────────────────────────────────────────────────────────────────────────

class PublicBlockedSlotsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, ground_id):
        try:
            ground = Ground.objects.get(pk=ground_id, is_approved=True)
        except Ground.DoesNotExist:
            return Response({"detail": "Ground not found."}, status=404)

        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"detail": "date query param required (YYYY-MM-DD)."}, status=400)

        try:
            from datetime import date as date_cls
            booking_date = date_cls.fromisoformat(date_str)
        except ValueError:
            return Response({"detail": "Invalid date format."}, status=400)

        day_of_week   = booking_date.weekday()
        active_blocks = BlockedSlot.objects.filter(ground=ground, is_active=True)

        blocked_hours = []
        full_day      = False
        block_reason  = ""

        for block in active_blocks:
            # Date match
            if block.block_type == 'date':
                if block.blocked_date != booking_date:
                    continue
            elif block.block_type == 'recurring':
                if block.day_of_week != day_of_week:
                    continue

            if block.is_full_day:
                full_day     = True
                block_reason = block.reason or "Unavailable"
                break
            else:
                for h in range(block.start_hour, block.end_hour):
                    blocked_hours.append({
                        "hour":   h,
                        "reason": block.reason or "Unavailable",
                    })

        return Response({
            "date":          date_str,
            "full_day":      full_day,
            "block_reason":  block_reason,
            "blocked_hours": blocked_hours,
        })