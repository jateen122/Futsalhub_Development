# backend/grounds/migrations/0005_peak_pricing_rule.py

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grounds', '0004_ground_latitude_longitude'),
    ]

    operations = [
        migrations.CreateModel(
            name='PeakPricingRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_of_week', models.IntegerField(
                    choices=[
                        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
                        (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday'),
                    ],
                    help_text='0=Monday, 6=Sunday. Use -1 for all days.',
                    default=-1,
                )),
                ('start_hour', models.PositiveSmallIntegerField(
                    help_text='Peak period start hour (0-23)',
                )),
                ('end_hour', models.PositiveSmallIntegerField(
                    help_text='Peak period end hour (0-23), exclusive',
                )),
                ('price_per_hour', models.DecimalField(
                    max_digits=10, decimal_places=2,
                    help_text='Price per hour during this peak period',
                )),
                ('label', models.CharField(
                    max_length=100,
                    default='Peak Hours',
                    help_text='e.g. "Evening Peak", "Weekend Rate"',
                )),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ground', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='peak_pricing_rules',
                    to='grounds.ground',
                )),
            ],
            options={
                'verbose_name': 'Peak Pricing Rule',
                'verbose_name_plural': 'Peak Pricing Rules',
                'ordering': ['start_hour'],
            },
        ),
    ]
