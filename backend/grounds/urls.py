from django.urls import path
from .views import (
    CreateGroundView,
    UpdateGroundView,
    DeleteGroundView,
    ApproveGroundView,
    PublicGroundListView,
    OwnerGroundListView,
    AdminGroundListView,
    AdminGroundDetailView,
)

app_name = "grounds"

urlpatterns = [
    # Public
    path("", PublicGroundListView.as_view(), name="ground-list"),

    # Owner
    path("create/", CreateGroundView.as_view(), name="ground-create"),
    path("my/", OwnerGroundListView.as_view(), name="ground-my-list"),
    path("<int:pk>/update/", UpdateGroundView.as_view(), name="ground-update"),
    path("<int:pk>/delete/", DeleteGroundView.as_view(), name="ground-delete"),

    # Admin
    path("admin/all/", AdminGroundListView.as_view(), name="admin-ground-list"),
    path("admin/<int:pk>/", AdminGroundDetailView.as_view(), name="admin-ground-detail"),
    path("<int:pk>/approve/", ApproveGroundView.as_view(), name="ground-approve"),
]