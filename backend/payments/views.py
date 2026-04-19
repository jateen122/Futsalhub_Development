# backend/payments/views.py
import uuid
import logging
from datetime import datetime as dt_datetime
from decimal import Decimal

import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from bookings.models import Booking, LoyaltyRecord
from grounds.models import Ground
from .models import Payment
from .serializers import PaymentSerializer

logger = logging.getLogger(__name__)

KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/"
KHALTI_LOOKUP_URL   = "https://dev.khalti.com/api/v2/epayment/lookup/"
KHALTI_SECRET_KEY   = getattr(settings, "KHALTI_SECRET_KEY", "05bf95cc57244045b8df5fad06748dab")


def _parse_time_str(t_str):
    """Safely parse HH:MM or HH:MM:SS string into a time object."""
    if not t_str:
        raise ValueError("Empty time string")
    t_str = str(t_str).strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return dt_datetime.strptime(t_str[:8], fmt).time()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse time: {t_str!r}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/initiate/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    ground_id   = request.data.get("ground_id")
    date_str    = request.data.get("date")
    start_time  = request.data.get("start_time")
    end_time    = request.data.get("end_time")
    return_url  = request.data.get("return_url",  "http://localhost:5173/payment/verify")
    website_url = request.data.get("website_url", "http://localhost:5173")

    if not all([ground_id, date_str, start_time, end_time]):
        return Response(
            {"detail": "ground_id, date, start_time, and end_time are required."},
            status=400,
        )

    try:
        ground = Ground.objects.get(pk=ground_id, is_approved=True)
    except Ground.DoesNotExist:
        return Response({"detail": "Ground not found or not approved."}, status=404)

    try:
        from datetime import date as date_cls, timedelta
        booking_date = date_cls.fromisoformat(str(date_str).strip())
        start_t = _parse_time_str(start_time)
        end_t   = _parse_time_str(end_time)
    except (ValueError, TypeError) as exc:
        return Response({"detail": f"Invalid date/time format: {exc}"}, status=400)

    if start_t >= end_t:
        return Response({"detail": "end_time must be after start_time."}, status=400)

    from datetime import timedelta as td
    slot_dt = timezone.make_aware(dt_datetime.combine(booking_date, start_t))
    if slot_dt < timezone.now() + td(minutes=30):
        return Response(
            {"detail": "You must book at least 30 minutes before the slot starts."},
            status=400,
        )

    is_blocked, block_reason = ground.is_slot_blocked(booking_date, start_t.hour)
    if is_blocked:
        return Response(
            {"detail": f"This slot is blocked: {block_reason or 'Unavailable'}."},
            status=400,
        )

    conflicts = Booking.objects.filter(
        ground=ground,
        date=booking_date,
        start_time__lt=end_t,
        end_time__gt=start_t,
    ).exclude(status__in=["cancelled", "refunded", "pending"])

    if conflicts.exists():
        return Response(
            {"detail": "This slot is already booked. Please choose a different time."},
            status=400,
        )

    effective_price = ground.get_price_for_slot(booking_date, start_t.hour)
    start_dt    = dt_datetime.combine(booking_date, start_t)
    end_dt      = dt_datetime.combine(booking_date, end_t)
    duration_hr = Decimal(str((end_dt - start_dt).total_seconds() / 3600))
    total_price = (effective_price * duration_hr).quantize(Decimal("0.01"))

    amount_paisa = int(float(total_price) * 100)
    if amount_paisa < 1000:
        return Response(
            {"detail": "Minimum payment amount is Rs 10 (1000 paisa)."},
            status=400,
        )

    purchase_order_id = f"FH-{uuid.uuid4().hex[:12].upper()}"

    phone_raw = getattr(request.user, "phone", "") or "9800000000"
    phone = str(phone_raw).strip() or "9800000000"

    khalti_payload = {
        "return_url":          return_url,
        "website_url":         website_url,
        "amount":              amount_paisa,
        "purchase_order_id":   purchase_order_id,
        "purchase_order_name": f"FutsalHub – {ground.name}",
        "customer_info": {
            "name":  getattr(request.user, "full_name", None) or request.user.email,
            "email": request.user.email,
            "phone": phone,
        },
        "amount_breakdown": [
            {"label": "Ground Booking", "amount": amount_paisa}
        ],
        "product_details": [
            {
                "identity":    str(ground.id),
                "name":        f"{ground.name} ({booking_date})",
                "total_price": amount_paisa,
                "quantity":    1,
                "unit_price":  amount_paisa,
            }
        ],
    }

    headers = {
        "Authorization": f"Key {KHALTI_SECRET_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        resp = requests.post(KHALTI_INITIATE_URL, json=khalti_payload, headers=headers, timeout=20)
        khalti_data = resp.json()
    except requests.RequestException as exc:
        logger.error(f"Khalti initiate network error: {exc}")
        return Response({"detail": f"Could not reach Khalti: {exc}"}, status=502)

    if resp.status_code != 200:
        logger.error(f"Khalti initiate failed {resp.status_code}: {khalti_data}")
        detail = khalti_data.get("detail") or str(khalti_data)
        return Response({"detail": f"Khalti error: {detail}"}, status=resp.status_code)

    pidx = khalti_data.get("pidx", "")

    Payment.objects.create(
        booking           = None,
        user              = request.user,
        pidx              = pidx,
        purchase_order_id = purchase_order_id,
        amount            = total_price,
        status            = Payment.Status.INIT,
        payment_method    = Payment.Method.KHALTI,
        extra_data        = {
            "ground_id":  ground.id,
            "date":       str(booking_date),
            "start_time": start_t.strftime("%H:%M:%S"),
            "end_time":   end_t.strftime("%H:%M:%S"),
        },
    )

    logger.info(f"Khalti initiated pidx={pidx} amount={total_price} user={request.user.email}")

    return Response({
        "pidx":        pidx,
        "payment_url": khalti_data["payment_url"],
        "expires_at":  khalti_data.get("expires_at"),
        "expires_in":  khalti_data.get("expires_in"),
        "amount":      str(total_price),
    }, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/verify/
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    pidx = request.data.get("pidx")
    if not pidx:
        return Response({"detail": "pidx is required."}, status=400)

    payment = Payment.objects.filter(pidx=pidx, user=request.user).first()
    if not payment:
        return Response(
            {"detail": "Payment record not found. It may have already been processed."},
            status=404,
        )

    if payment.status == Payment.Status.SUCCESS and payment.booking_id:
        try:
            booking = payment.booking
            return Response({
                "status":         "success",
                "message":        "Payment already verified.",
                "transaction_id": payment.transaction_id or "",
                "amount":         str(payment.amount),
                "booking_id":     booking.id,
                "ground_name":    booking.ground.name,
                "date":           str(booking.date),
                "start_time":     str(booking.start_time),
                "end_time":       str(booking.end_time),
                "payment_method": "Khalti",
            })
        except Exception:
            pass

    headers = {
        "Authorization": f"Key {KHALTI_SECRET_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        resp = requests.post(
            KHALTI_LOOKUP_URL,
            json={"pidx": pidx},
            headers=headers,
            timeout=20,
        )
        khalti_data = resp.json()
    except requests.RequestException as exc:
        logger.error(f"Khalti lookup network error pidx={pidx}: {exc}")
        return Response(
            {
                "status": "failed",
                "detail": f"Network error contacting Khalti: {exc}. Please try again in a moment.",
            },
            status=200,
        )

    khalti_status  = khalti_data.get("status", "")
    transaction_id = khalti_data.get("transaction_id", "")
    logger.info(f"Khalti lookup pidx={pidx} status={khalti_status!r} txn={transaction_id!r}")

    # ── COMPLETED ─────────────────────────────────────────────────────────────
    if khalti_status == "Completed":
        extra = payment.extra_data or {}

        if not extra or "ground_id" not in extra:
            logger.error(f"Payment {payment.id} has no/incomplete extra_data: {extra}")
            return Response(
                {"detail": "Payment data is incomplete. Please contact support."},
                status=500,
            )

        try:
            from datetime import date as date_cls
            ground = Ground.objects.get(pk=extra["ground_id"])
            booking_date = date_cls.fromisoformat(extra["date"])
            start_t = _parse_time_str(extra["start_time"])
            end_t   = _parse_time_str(extra["end_time"])
        except (KeyError, ValueError, Ground.DoesNotExist) as exc:
            logger.error(f"Cannot rebuild booking from extra_data={extra}: {exc}")
            return Response(
                {"detail": "Failed to create booking from payment data. Contact support."},
                status=500,
            )

        conflicts = Booking.objects.filter(
            ground=ground,
            date=booking_date,
            start_time__lt=end_t,
            end_time__gt=start_t,
        ).exclude(status__in=["cancelled", "refunded", "pending"])

        if conflicts.exists():
            payment.status = "FAILED"
            payment.khalti_status = khalti_status
            payment.save(update_fields=["status", "khalti_status"])
            return Response({
                "status":  "failed",
                "message": (
                    "Payment succeeded but the slot was taken. "
                    "Contact support for a refund. Ref: " + payment.purchase_order_id
                ),
            }, status=200)

        # Create confirmed booking — mark payment_received=True immediately
        booking = Booking.objects.create(
            user             = request.user,
            ground           = ground,
            date             = booking_date,
            start_time       = start_t,
            end_time         = end_t,
            total_price      = payment.amount,
            status           = Booking.Status.CONFIRMED,
            is_free_booking  = False,
            payment_received = True,   # ← Khalti payment confirmed; never revert this
        )

        payment.booking        = booking
        payment.status         = Payment.Status.SUCCESS
        payment.transaction_id = transaction_id
        payment.khalti_status  = khalti_status
        payment.save()

        # +20% loyalty progress for paid confirmed booking
        record = LoyaltyRecord.get_or_create_for(request.user, ground)
        record.record_confirmed_booking()

        logger.info(f"Booking {booking.id} confirmed via Khalti pidx={pidx}")

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

    # ── PENDING / INITIATED ───────────────────────────────────────────────────
    elif khalti_status in ("Pending", "Initiated"):
        payment.khalti_status = khalti_status
        payment.save(update_fields=["khalti_status"])
        return Response({
            "status":        "pending",
            "message":       (
                "Your payment is still being processed by Khalti. "
                "Please wait a moment and check your bookings page."
            ),
            "khalti_status": khalti_status,
        }, status=200)

    # ── USER CANCELED ─────────────────────────────────────────────────────────
    elif khalti_status == "User canceled":
        payment.delete()
        return Response({"status": "canceled", "message": "Payment was cancelled."}, status=200)

    # ── EXPIRED / FAILED / OTHER ──────────────────────────────────────────────
    else:
        payment.delete()
        return Response({
            "status":        "failed",
            "message":       (
                f"Payment was not completed (status: {khalti_status or 'Unknown'}). "
                "The slot is still available. Please try again."
            ),
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
        .filter(user=request.user, status=Payment.Status.SUCCESS)
        .select_related("booking", "booking__ground")
        .order_by("-created_at")
    )
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/payments/simulate/   (Cash)
# ─────────────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def simulate_payment(request):
    booking_id = request.data.get("booking_id")
    if not booking_id:
        return Response({"detail": "booking_id is required."}, status=400)

    booking = get_object_or_404(Booking, pk=booking_id, user=request.user)

    existing = Payment.objects.filter(
        booking=booking,
        payment_method=Payment.Method.CASH,
        status=Payment.Status.SUCCESS,
    ).first()
    if existing:
        return Response({
            "status":         "success",
            "message":        "Cash payment already recorded.",
            "transaction_id": existing.transaction_id,
            "amount":         str(booking.total_price),
            "payment_method": "Cash",
            "booking_id":     booking.id,
        })

    txn_id = f"CASH-{uuid.uuid4().hex[:10].upper()}"

    Payment.objects.create(
        booking           = booking,
        user              = request.user,
        pidx              = "",
        purchase_order_id = f"FH-CASH-{booking.id}-{uuid.uuid4().hex[:6]}",
        transaction_id    = txn_id,
        amount            = booking.total_price,
        status            = Payment.Status.SUCCESS,
        payment_method    = Payment.Method.CASH,
        extra_data        = {},
    )

    return Response({
        "status":         "success",
        "message":        "Cash payment recorded. Please pay at the venue.",
        "transaction_id": txn_id,
        "amount":         str(booking.total_price),
        "payment_method": "Cash",
        "booking_id":     booking.id,
    })