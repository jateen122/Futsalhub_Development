# backend/grounds/urls.py
from django.urls import path
from .views import (
    PublicGroundListView,
    AdminGroundListView,
    AdminGroundDetailView,
    CreateGroundView,
    UpdateGroundView,
    DeleteGroundView,
    ApproveGroundView,
    OwnerGroundListView,
    ToggleFavoriteView,
    FavoriteListView,
    # Peak pricing
    PeakPricingRuleListCreateView,
    PeakPricingRuleDetailView,
    # Slot pricing
    SlotPricingView,
)

app_name = "grounds"

urlpatterns = [

    # ── Public ───────────────────────────────────────────────────
    path("",                       PublicGroundListView.as_view(),  name="ground-list"),

    # ── Admin ────────────────────────────────────────────────────
    path("admin/all/",             AdminGroundListView.as_view(),   name="admin-ground-list"),
    path("admin/<int:pk>/",        AdminGroundDetailView.as_view(), name="admin-ground-detail"),

    # ── Owner ────────────────────────────────────────────────────
    path("create/",                CreateGroundView.as_view(),      name="ground-create"),
    path("my/",                    OwnerGroundListView.as_view(),   name="ground-my-list"),
    path("<int:pk>/update/",       UpdateGroundView.as_view(),      name="ground-update"),
    path("<int:pk>/delete/",       DeleteGroundView.as_view(),      name="ground-delete"),

    # ── Admin approval ───────────────────────────────────────────
    path("<int:pk>/approve/",      ApproveGroundView.as_view(),     name="ground-approve"),

    # ── Favorites ────────────────────────────────────────────────
    path("favorites/",             FavoriteListView.as_view(),      name="favorite-list"),
    path("favorites/toggle/",      ToggleFavoriteView.as_view(),    name="favorite-toggle"),

    # ── Peak Pricing ─────────────────────────────────────────────
    # Owner: list & create rules for their ground
    path("<int:ground_id>/pricing/",       PeakPricingRuleListCreateView.as_view(), name="peak-pricing-list"),
    # Owner: update & delete a specific rule
    path("<int:ground_id>/pricing/<int:pk>/", PeakPricingRuleDetailView.as_view(),  name="peak-pricing-detail"),

    # Public: get effective price for a specific date + hour
    path("<int:ground_id>/slot-price/",    SlotPricingView.as_view(),               name="slot-price"),
]