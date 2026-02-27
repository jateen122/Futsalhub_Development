from django.urls import path
from .views import (
    CreateGroundView,
    UpdateGroundView,
    DeleteGroundView,      # ✅ Added
    ApproveGroundView,
    PublicGroundListView,
    OwnerGroundListView,
)

app_name = "grounds"

urlpatterns = [

    # ─────────────────────────────────────────────
    # PUBLIC ROUTES (No Authentication Required)
    # ─────────────────────────────────────────────
    path(
        "",
        PublicGroundListView.as_view(),
        name="ground-list",
    ),

    # ─────────────────────────────────────────────
    # OWNER ROUTES (role='owner' required)
    # ─────────────────────────────────────────────
    path(
        "create/",
        CreateGroundView.as_view(),
        name="ground-create",
    ),

    path(
        "my/",
        OwnerGroundListView.as_view(),
        name="ground-my-list",
    ),

    path(
        "<int:pk>/update/",
        UpdateGroundView.as_view(),
        name="ground-update",
    ),

    path(
        "<int:pk>/delete/",      # ✅ NEW
        DeleteGroundView.as_view(),
        name="ground-delete",
    ),

    # ─────────────────────────────────────────────
    # ADMIN ROUTE (role='admin' required)
    # ─────────────────────────────────────────────
    path(
        "<int:pk>/approve/",
        ApproveGroundView.as_view(),
        name="ground-approve",
    ),
]