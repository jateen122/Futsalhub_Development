import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grounds', '0005_peak_pricing_rule'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlockedSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('block_type', models.CharField(
                    max_length=10,
                    choices=[('date', 'Specific Date'), ('recurring', 'Recurring Day')],
                    default='date',
                    help_text='Block a specific date or a recurring weekday.',
                )),
                ('blocked_date', models.DateField(
                    null=True, blank=True,
                    help_text='Block this specific date (used when block_type=date).',
                )),
                ('day_of_week', models.IntegerField(
                    null=True, blank=True,
                    choices=[
                        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
                        (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday'),
                    ],
                    help_text='0=Monday…6=Sunday. Used when block_type=recurring.',
                )),
                ('start_hour', models.PositiveSmallIntegerField(
                    null=True, blank=True,
                    help_text='Block from this hour. If null, blocks the full day.',
                )),
                ('end_hour', models.PositiveSmallIntegerField(
                    null=True, blank=True,
                    help_text='Block until this hour (exclusive). If null, blocks the full day.',
                )),
                ('reason', models.CharField(
                    max_length=200, blank=True, default='',
                    help_text='Reason shown to players, e.g. Maintenance, Private Event.',
                )),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ground', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='blocked_slots',
                    to='grounds.ground',
                )),
            ],
            options={
                'verbose_name': 'Blocked Slot',
                'verbose_name_plural': 'Blocked Slots',
                'ordering': ['ground', 'blocked_date', 'day_of_week', 'start_hour'],
            },
        ),
    ]
