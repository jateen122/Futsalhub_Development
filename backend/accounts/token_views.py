from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
 
User = get_user_model()
 
 
class EmailVerifiedTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").lower().strip()
        try:
            user = User.objects.get(email=email)
            if not user.is_verified:
                raise AuthenticationFailed(
                    "Please verify your email address before logging in. "
                    "Check your inbox for the OTP."
                )
        except User.DoesNotExist:
            pass
        return super().post(request, *args, **kwargs)
