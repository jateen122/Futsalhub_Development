# backend/grounds/migrations/0008_peakpricingrule_rule_type.py
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grounds', '0007_alter_blockedslot_block_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='peakpricingrule',
            name='rule_type',
            field=models.CharField(
                max_length=10,
                choices=[('peak', 'Peak Pricing'), ('off_peak', 'Off-Peak Discount')],
                default='peak',
                help_text="'peak' for higher prices, 'off_peak' for discounts",
            ),
        ),
    ]
