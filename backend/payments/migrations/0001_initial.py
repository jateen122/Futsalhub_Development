from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('bookings', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pidx',              models.CharField(blank=True, default='', max_length=100)),
                ('purchase_order_id', models.CharField(blank=True, default='', max_length=100)),
                ('transaction_id',    models.CharField(blank=True, default='', max_length=100)),
                ('khalti_status',     models.CharField(blank=True, default='', max_length=50)),
                ('amount',         models.DecimalField(decimal_places=2, max_digits=10)),
                ('status',         models.CharField(
                    choices=[('pending','Pending'),('success','Success'),('failed','Failed'),('refunded','Refunded')],
                    default='pending', max_length=15,
                )),
                ('payment_method', models.CharField(
                    choices=[('khalti','Khalti'),('cash','Cash')],
                    default='khalti', max_length=10,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payments',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payments',
                    to='bookings.booking',
                )),
            ],
            options={
                'verbose_name': 'Payment',
                'verbose_name_plural': 'Payments',
                'ordering': ['-created_at'],
            },
        ),
    ]
