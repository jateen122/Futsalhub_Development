from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0004_rescheduling_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='payment_received',
            field=models.BooleanField(
                default=False,
                verbose_name='Payment Received',
                help_text=(
                    'True once a successful Khalti payment is confirmed. '
                    'Never reverted on cancellation — the money stays with the owner.'
                ),
            ),
        ),
    ]
