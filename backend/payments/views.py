# backend/payments/views.py
import uuid
from datetime import datetime as dt_datetime
from decimal import Decimal

import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from bookings.models import Booking, LoyaltyRecord, ReschedulingToken, CANCEL_WINDOW_HOURS
from grounds.models import Ground
from .models import Payment
from .serializers import PaymentSerializer


KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/"
KHALTI_LOOKUP_URL   = "https://dev.khalti.com/api/v2/epayment/lookup/"
KHALTI_SECRET_KEY   = getattr(settings, "KHALTI_SECRET_KEY", "05bf95cc57244045b8df5fad06748dab")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/initiate/
#
# For Khalti: Creates the booking AND the pending Payment in one step.
# The slot is NOT locked until the user actually pays (booking stays PENDING
# but we delete it if Khalti verification fails or times out).
#
# Accepts same body as the old booking creation:
#   ground, date, start_time, end_time, is_free_booking (always false here),
#   plus return_url and website_url for Khalti.
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    DO NOT create booking here. Only validate the slot and initiate Khalti.
    Booking is created ONLY after payment succeeds via verify_payment().
    
    This ensures the slot remains truly free if the user abandons payment.
    """
    ground_id   = request.data.get("ground_id")
    date_str    = request.data.get("date")
    start_time  = request.data.get("start_time")
    end_time    = request.data.get("end_time")
    return_url  = request.data.get("return_url",  "http://localhost:5173/payment/verify")
    website_url = request.data.get("website_url", "http://localhost:5173")

    # Validate inputs
    if not all([ground_id, date_str, start_time, end_time]):
        return Response(
            {"detail": "ground_id, date, start_time, and end_time are required."},
            status=400,
        )

    try:
        ground = Ground.objects.get(pk=ground_id, is_approved=True)
    except Ground.DoesNotExist:
        return Response({"detail": "Ground not found or not approved."}, status=404)

    # Parse times
    try:
        from datetime import date as date_cls, time as time_cls
        booking_date  = date_cls.fromisoformat(date_str)
        start_t = dt_datetime.strptime(start_time[:5], "%H:%M").time()
        end_t   = dt_datetime.strptime(end_time[:5],   "%H:%M").time()
    except (ValueError, TypeError) as exc:
        return Response({"detail": f"Invalid date/time format: {exc}"}, status=400)

    if start_t >= end_t:
        return Response({"detail": "end_time must be after start_time."}, status=400)

    # Check blocked slots
    is_blocked, block_reason = ground.is_slot_blocked(booking_date, start_t.hour)
    if is_blocked:
        return Response(
            {"detail": f"This slot is blocked: {block_reason or 'Unavailable'}."},
            status=400,
        )

    # Check existing bookings (overlap) — exclude PENDING too
    conflicts = Booking.objects.filter(
        ground         = ground,
        date           = booking_date,
        start_time__lt = end_t,
        end_time__gt   = start_t,
    ).exclude(status__in=["cancelled", "refunded"])
    if conflicts.exists():
        return Response(
            {"detail": "This slot is already booked. Please choose a different time."},
            status=400,
        )

    # Dynamic pricing
    effective_price = ground.get_price_for_slot(booking_date, start_t.hour)
    start_dt    = dt_datetime.combine(booking_date, start_t)
    end_dt      = dt_datetime.combine(booking_date, end_t)
    duration_hr = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
    total_price = (effective_price * duration_hr).quantize(Decimal("0.01"))

    # Validate minimum amount
    amount_paisa = int(float(total_price) * 100)
    if amount_paisa < 1000:
        return Response(
            {"detail": "Minimum payment amount is Rs 10 (1000 paisa)."},
            status=400,
        )

    # ── STORE BOOKING DATA FOR LATER (do NOT create booking yet) ──────────────
    # Store slot info in Payment record so we can create booking after success
    purchase_order_id = f"FH-{uuid.uuid4().hex[:12].upper()}"

    payload = {
        "return_url": return_url,
        "website_url": website_url,
        "amount": amount_paisa,
        "purchase_order_id": purchase_order_id,
        "purchase_order_name": f"Booking for {ground.name}",
        "customer_info": {
            "name":  getattr(request.user, "full_name", request.user.email),
            "email": request.user.email,
            "phone": getattr(request.user, "phone", "9800000000"),
        },
        "amount_breakdown": [
            {"label": "Ground Booking", "amount": amount_paisa},
        ],
        "product_details": [
            {
                "identity":    str(ground.id),
                "name":        f"{ground.name} — {booking_date}",
                "total_price": amount_paisa,
                "quantity":    1,
                "unit_price":  amount_paisa,
            }
        ],
        "merchant_username": "FutsalHub",
        "merchant_extra":    f"ground_id:{ground.id}|date:{booking_date}|start:{start_t}|end:{end_t}",
    }

    headers = {
        "Authorization": f"Key {KHALTI_SECRET_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        resp = requests.post(KHALTI_INITIATE_URL, json=payload, headers=headers, timeout=15)
        data = resp.json()
    except requests.RequestException as exc:
        return Response({"detail": f"Khalti API error: {str(exc)}"}, status=502)

    if resp.status_code != 200:
        return Response(
            {"detail": "Khalti initiation failed.", "khalti_error": data},
            status=resp.status_code,
        )

    # Store in Payment as INIT (not even PENDING) — booking doesn't exist yet
    Payment.objects.create(
        booking           = None,  # No booking yet!
        user              = request.user,
        pidx              = data["pidx"],
        purchase_order_id = purchase_order_id,
        amount            = total_price,
        status            = "INIT",  # Custom status: awaiting user to complete Khalti
        payment_method    = Payment.Method.KHALTI,
        # Store slot data as custom fields (add to Payment model if needed)
        extra_data        = {
            "ground_id": ground.id,
            "date": str(booking_date),
            "start_time": str(start_t),
            "end_time": str(end_t),
        }
    )

    return Response({
        "pidx":        data["pidx"],
        "payment_url": data["payment_url"],
        "expires_at":  data.get("expires_at"),
        "expires_in":  data.get("expires_in"),
        "amount":      str(total_price),
    }, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/verify/
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    UPDATED: Create booking ONLY on successful payment verification.
    
    - Completed  → create booking + award loyalty
    - Pending    → keep payment as INIT, inform user
    - Failed/etc → delete payment record, slot remains free
    """
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
    except requests.RequestException as exc:
        return Response({"detail": f"Khalti lookup error: {str(exc)}"}, status=502)

    khalti_status  = data.get("status", "")
    transaction_id = data.get("transaction_id")

    if khalti_status == "Completed":
        # ── NOW CREATE THE BOOKING ─────────────────────────────────────────
        extra_data = getattr(payment, 'extra_data', {})
        try:
            ground = Ground.objects.get(pk=extra_data.get('ground_id'))
            booking_date = dt_datetime.strptime(extra_data.get('date'), "%Y-%m-%d").date()
            start_t = dt_datetime.strptime(extra_data.get('start_time'), "%H:%M:%S").time()
            end_t = dt_datetime.strptime(extra_data.get('end_time'), "%H:%M:%S").time()
        except (KeyError, ValueError, Ground.DoesNotExist):
            return Response(
                {"detail": "Failed to recreate booking from payment data."},
                status=500
            )

        # Create booking with CONFIRMED status (since payment is verified)
        booking = Booking.objects.create(
            user            = request.user,
            ground          = ground,
            date            = booking_date,
            start_time      = start_t,
            end_time        = end_t,
            total_price     = payment.amount,
            status          = Booking.Status.CONFIRMED,  # Directly confirmed!
            is_free_booking = False,
        )

        # Link payment to booking & mark as SUCCESS
        payment.booking        = booking
        payment.status         = Payment.Status.SUCCESS
        payment.transaction_id = transaction_id
        payment.khalti_status  = khalti_status
        payment.save()

        # Award loyalty
        if not booking.is_free_booking:
            record = LoyaltyRecord.get_or_create_for(booking.user, ground)
            record.record_confirmed_booking()

        return Response({
            "status":         "success",
            "message":        "Payment verified. Booking confirmed!",
            "transaction_id": transaction_id,
            "amount":         str(payment.amount),
            "booking_id":     booking.id,
            "ground_name":    ground.name,
            "date":           str(booking.date),
            "start_time":     str(booking.start_time),
            "end_time":       str(booking.end_time),
            "payment_method": "Khalti",
        })

    elif khalti_status in ["Pending", "Initiated"]:
        payment.khalti_status = khalti_status
        payment.save(update_fields=["khalti_status"])
        return Response({
            "status":        "pending",
            "message":       "Payment is still pending. Please complete payment on Khalti.",
            "khalti_status": khalti_status,
        }, status=200)

    else:
        # Payment failed — DELETE payment record so slot is completely free
        payment.delete()

        return Response({
            "status":        "failed",
            "message":       f"Payment {khalti_status}. Please try again.",
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
    """
    Cash payment: booking_id must already exist (created by BookingPage for cash flow).
    Records the cash payment. Booking stays PENDING until owner confirms on-site.
    """
    booking_id = request.data.get("booking_id")
    if not booking_id:
        return Response({"detail": "booking_id is required."}, status=400)

    booking = get_object_or_404(Booking, pk=booking_id, user=request.user)

    txn_id = f"CASH-{uuid.uuid4().hex[:10].upper()}"

    Payment.objects.create(
        booking           = booking,
        user              = request.user,
        pidx              = "",
        purchase_order_id = f"FH-CASH-{booking.id}",
        transaction_id    = txn_id,
        amount            = booking.total_price,
        status            = Payment.Status.SUCCESS,
        payment_method    = Payment.Method.CASH,
    )

    return Response({
        "status":         "success",
        "message":        "Cash payment recorded. Please pay at the venue.",
        "transaction_id": txn_id,
        "amount":         str(booking.total_price),
        "payment_method": "Cash",
        "booking_id":     booking.id,
    })