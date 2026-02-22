from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, ProfileSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/

    Public endpoint — no authentication required.

    Creates a new user account.
    - PLAYER accounts are automatically verified (is_verified=True).
    - OWNER accounts require manual admin verification (is_verified=False).

    Returns the new user's id, email, full_name, role, and is_verified status.
    Password is write-only and never returned.
    """

    queryset             = User.objects.all()
    serializer_class     = RegisterSerializer
    permission_classes   = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Build a clean, minimal response (exclude write-only fields)
        return Response(
            {
                "message"     : "Account created successfully.",
                "user": {
                    "id"          : user.id,
                    "email"       : user.email,
                    "full_name"   : user.full_name,
                    "role"        : user.role,
                    "is_verified" : user.is_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/accounts/profile/   → retrieve authenticated user's profile
    PUT  /api/accounts/profile/   → full update
    PATCH /api/accounts/profile/  → partial update

    JWT authentication required.
    Users may only view and edit their own profile.
    Sensitive fields (role, is_verified, email) are read-only.
    """

    serializer_class   = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Always return the currently authenticated user."""
        return self.request.user
