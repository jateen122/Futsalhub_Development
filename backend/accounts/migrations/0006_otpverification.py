"""
Migration: Add OTPVerification model to accounts app.

Run after your existing migrations:
    python manage.py migrate accounts
"""

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):

    # ── Update this to match your latest accounts migration ──────────────────
    # Example: if your last migration is 0005_merge_20260321_1510, use that.
    dependencies = [
        ("accounts", "0005_merge_20260321_1510"),
    ]

    operations = [
        migrations.CreateModel(
            name="OTPVerification",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "otp_hash",
                    models.CharField(
                        max_length=64,
                        help_text="SHA-256 hash of the OTP — never stored in plain text.",
                    ),
                ),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("expires_at",   models.DateTimeField()),
                ("attempts",     models.PositiveSmallIntegerField(default=0)),
                ("is_used",      models.BooleanField(default=False)),
                (
                    "last_sent_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="otp_verification",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name":        "OTP Verification",
                "verbose_name_plural": "OTP Verifications",
            },
        ),
    ]
