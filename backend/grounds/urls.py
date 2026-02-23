from django.urls import path
from .views import (
    CreateGroundView,
    UpdateGroundView,
    ApproveGroundView,
    PublicGroundListView,
    OwnerGroundListView,
)

app_name = "grounds"

urlpatterns = [
    # Public — no auth required
    path("",                        PublicGroundListView.as_view(), name="ground-list"),

    # Owner — role='owner' required
    path("create/",                 CreateGroundView.as_view(),     name="ground-create"),
    path("my/",                     OwnerGroundListView.as_view(),  name="ground-my-list"),
    path("<int:pk>/update/",        UpdateGroundView.as_view(),     name="ground-update"),

    # Admin — role='admin' required
    path("<int:pk>/approve/",       ApproveGroundView.as_view(),    name="ground-approve"),
]
