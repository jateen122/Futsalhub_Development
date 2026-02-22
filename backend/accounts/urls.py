from django.urls import path
from .views import RegisterView, ProfileView

app_name = "accounts"

urlpatterns = [
    # Public
    path("register/", RegisterView.as_view(), name="register"),

    # Protected (JWT required)
    path("profile/",  ProfileView.as_view(),  name="profile"),
]
