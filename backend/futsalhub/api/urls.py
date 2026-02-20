from django.urls import path
from .views import register_player, register_owner, login_user

urlpatterns = [
    path('register/player/', register_player),
    path('register/owner/', register_owner),
    path('login/', login_user),
]
