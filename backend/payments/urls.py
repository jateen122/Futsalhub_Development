from django.urls import path
from . import views

urlpatterns = [
    # Khalti: initiate checkout session
    path("initiate/",   views.initiate_payment, name="payment-initiate"),

    # Khalti: verify payment via lookup API (called after Khalti redirect)
    path("verify/",     views.verify_payment,   name="payment-verify"),

    # Cash payment simulation fallback
    path("simulate/",   views.simulate_payment, name="simulate-payment"),

    # List user's payment history
    path("",            views.payment_list,     name="payment-list"),
]
