# backend/bookings/migrations/0004_rescheduling_token.py

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_alter_loyaltyrecord_confirmed_count'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReschedulingToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, unique=True, editable=False)),
                ('original_ground', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='rescheduling_tokens',
                    to='grounds.ground',
                    verbose_name='Original Ground',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='rescheduling_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('original_date', models.DateField()),
                ('original_start_time', models.TimeField()),
                ('original_end_time', models.TimeField()),
                ('original_price', models.DecimalField(max_digits=10, decimal_places=2)),
                ('is_used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
            ],
            options={
                'verbose_name': 'Rescheduling Token',
                'verbose_name_plural': 'Rescheduling Tokens',
                'ordering': ['-created_at'],
            },
        ),
    ]
