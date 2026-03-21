from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailVerifiedTokenObtainPairView(TokenObtainPairView):
    """
    Extends SimpleJWT's token view to block login
    if the user has not yet verified their email address.
    """

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").lower().strip()

        # Check email verification BEFORE running the default JWT auth
        try:
            user = User.objects.get(email=email)
            if not user.is_email_verified:
                raise AuthenticationFailed(
                    "Please verify your email address before logging in. "
                    "Check your inbox for the verification link."
                )
        except User.DoesNotExist:
            pass  # Let SimpleJWT handle the invalid credentials error

        return super().post(request, *args, **kwargs)
