from django.urls import path
from . import views

urlpatterns = [
    # Example endpoints (you can adjust later)
    path("simulate/", views.simulate_payment, name="simulate-payment"),
    path("", views.payment_list, name="payment-list"),
]