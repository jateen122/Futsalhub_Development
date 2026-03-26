# backend/bookings/migrations/0002_loyalty_tracking.py
# Generated migration — adds LoyaltyRecord model to track bookings per ground per user

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LoyaltyRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('confirmed_count', models.PositiveIntegerField(default=0, help_text='Number of confirmed bookings by this user at this ground.')),
                ('free_bookings_earned', models.PositiveIntegerField(default=0, help_text='Total free bookings earned (every 5 confirmed bookings).')),
                ('free_bookings_used', models.PositiveIntegerField(default=0, help_text='Free bookings already redeemed.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='loyalty_records',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('ground', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='loyalty_records',
                    to='grounds.ground',
                )),
            ],
            options={
                'verbose_name': 'Loyalty Record',
                'verbose_name_plural': 'Loyalty Records',
                'ordering': ['-updated_at'],
                'unique_together': {('user', 'ground')},
            },
        ),
        migrations.AddField(
            model_name='booking',
            name='is_free_booking',
            field=models.BooleanField(
                default=False,
                help_text='True if this booking was redeemed as a loyalty free booking.',
                verbose_name='Free Booking',
            ),
        ),
    ]