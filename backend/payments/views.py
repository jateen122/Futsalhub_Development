import uuid
import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from bookings.models import Booking
from .models import Payment
from .serializers import PaymentSerializer


KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/"
KHALTI_LOOKUP_URL   = "https://dev.khalti.com/api/v2/epayment/lookup/"
KHALTI_SECRET_KEY   = getattr(settings, "KHALTI_SECRET_KEY", "05bf95cc57244045b8df5fad06748dab")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/initiate/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Initiates a Khalti ePay checkout session for a PENDING booking only.
    """
    booking_id  = request.data.get("booking_id")
    return_url  = request.data.get("return_url", "http://localhost:5173/payment/verify")
    website_url = request.data.get("website_url", "http://localhost:5173")

    if not booking_id:
        return Response({"detail": "booking_id is required."}, status=400)

    booking = get_object_or_404(Booking, pk=booking_id, user=request.user)

    # 🔥 FIXED: Only allow payment on PENDING bookings
    if booking.status != Booking.Status.PENDING:
        return Response(
            {"detail": f"Cannot pay for a booking with status '{booking.status}'."},
            status=400,
        )

    # Check if already successfully paid
    if Payment.objects.filter(booking=booking, status=Payment.Status.SUCCESS).exists():
        return Response({"detail": "This booking is already paid."}, status=400)

    # Amount in paisa (Khalti requires paisa)
    amount_paisa = int(float(booking.total_price) * 100)

    if amount_paisa < 1000:
        return Response(
            {"detail": "Minimum payment amount is Rs 10 (1000 paisa)."},
            status=400,
        )

    purchase_order_id = f"FH-{booking.id}-{uuid.uuid4().hex[:8].upper()}"

    payload = {
        "return_url": return_url,
        "website_url": website_url,
        "amount": amount_paisa,
        "purchase_order_id": purchase_order_id,
        "purchase_order_name": f"Booking for {booking.ground.name}",
        "customer_info": {
            "name":  getattr(request.user, 'full_name', request.user.email),
            "email": request.user.email,
            "phone": getattr(request.user, 'phone', "9800000000"),
        },
        "amount_breakdown": [
            {"label": "Ground Booking", "amount": amount_paisa},
        ],
        "product_details": [
            {
                "identity": str(booking.id),
                "name":     f"{booking.ground.name} — {booking.date}",
                "total_price": amount_paisa,
                "quantity":    1,
                "unit_price":  amount_paisa,
            }
        ],
        "merchant_username": "FutsalHub",
        "merchant_extra":    f"booking_id:{booking.id}",
    }

    headers = {
        "Authorization": f"Key {KHALTI_SECRET_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        resp = requests.post(KHALTI_INITIATE_URL, json=payload, headers=headers, timeout=15)
        data = resp.json()
    except requests.RequestException as e:
        return Response({"detail": f"Khalti API error: {str(e)}"}, status=502)

    if resp.status_code != 200:
        return Response(
            {"detail": "Khalti initiation failed.", "khalti_error": data},
            status=resp.status_code,
        )

    # Remove any old pending payments for this booking
    Payment.objects.filter(booking=booking, status=Payment.Status.PENDING).delete()

    # Create new pending payment record
    payment = Payment.objects.create(
        booking=booking,
        user=request.user,
        pidx=data["pidx"],
        purchase_order_id=purchase_order_id,
        amount=booking.total_price,
        status=Payment.Status.PENDING,
        payment_method=Payment.Method.KHALTI,
    )

    return Response({
        "pidx":        data["pidx"],
        "payment_url": data["payment_url"],
        "expires_at":  data.get("expires_at"),
        "expires_in":  data.get("expires_in"),
        "booking_id":  booking.id,
        "amount":      str(booking.total_price),
    }, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/verify/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """Verify payment using Khalti Lookup API and confirm booking + loyalty"""
    pidx = request.data.get("pidx")

    if not pidx:
        return Response({"detail": "pidx is required."}, status=400)

    payment = Payment.objects.filter(pidx=pidx, user=request.user).first()
    if not payment:
        return Response({"detail": "Payment record not found."}, status=404)

    headers = {
        "Authorization": f"Key {KHALTI_SECRET_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        resp = requests.post(KHALTI_LOOKUP_URL, json={"pidx": pidx}, headers=headers, timeout=15)
        data = resp.json()
    except requests.RequestException as e:
        return Response({"detail": f"Khalti lookup error: {str(e)}"}, status=502)

    khalti_status = data.get("status", "")
    transaction_id = data.get("transaction_id")

    if khalti_status == "Completed":
        # Mark payment successful
        payment.status = Payment.Status.SUCCESS
        payment.transaction_id = transaction_id
        payment.khalti_status = khalti_status
        payment.save()

        # Confirm the booking
        booking = payment.booking

        if booking.status != Booking.Status.CONFIRMED:
            booking.status = Booking.Status.CONFIRMED
            booking.save(update_fields=["status"])

            # Award loyalty points for paid bookings
            if not booking.is_free_booking:
                from bookings.models import LoyaltyRecord
                record = LoyaltyRecord.get_or_create_for(booking.user, booking.ground)
                record.record_confirmed_booking()

        return Response({
            "status":         "success",
            "message":        "Payment verified. Booking confirmed!",
            "transaction_id": transaction_id,
            "amount":         str(payment.amount),
            "booking_id":     booking.id,
            "ground_name":    booking.ground.name,
            "date":           str(booking.date),
            "start_time":     str(booking.start_time),
            "end_time":       str(booking.end_time),
            "payment_method": "Khalti",
        })

    elif khalti_status in ["Pending", "Initiated"]:
        payment.khalti_status = khalti_status
        payment.save(update_fields=["khalti_status"])
        return Response({
            "status":  "pending",
            "message": "Payment is still pending. Please try again shortly.",
            "khalti_status": khalti_status,
        }, status=200)

    else:
        # Failed or cancelled
        payment.status = Payment.Status.FAILED
        payment.khalti_status = khalti_status
        payment.save(update_fields=["status", "khalti_status"])

        return Response({
            "status":        "failed",
            "message":       f"Payment {khalti_status}. Booking not confirmed.",
            "khalti_status": khalti_status,
        }, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/payments/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_list(request):
    payments = (
        Payment.objects
        .filter(user=request.user)
        .select_related("booking", "booking__ground")
        .order_by("-created_at")
    )
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/simulate/   (Cash Payment)
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def simulate_payment(request):
    booking_id = request.data.get("booking_id")
    if not booking_id:
        return Response({"detail": "booking_id is required."}, status=400)

    booking = get_object_or_404(Booking, pk=booking_id, user=request.user)

    txn_id = f"CASH-{uuid.uuid4().hex[:10].upper()}"

    payment = Payment.objects.create(
        booking=booking,
        user=request.user,
        pidx="",
        purchase_order_id=f"FH-CASH-{booking.id}",
        transaction_id=txn_id,
        amount=booking.total_price,
        status=Payment.Status.SUCCESS,
        payment_method=Payment.Method.CASH,
    )

    # For cash payments, we keep booking as PENDING (owner confirms on-site)
    # Or you can auto-confirm if you prefer:
    # booking.status = Booking.Status.CONFIRMED
    # booking.save(update_fields=["status"])

    return Response({
        "status":         "success",
        "message":        "Cash payment recorded. Please pay at the venue.",
        "transaction_id": txn_id,
        "amount":         str(payment.amount),
        "payment_method": "Cash",
        "booking_id":     booking.id,
    })