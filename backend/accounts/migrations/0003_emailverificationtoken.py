import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_user_options_alter_user_created_at_and_more'),
    ]

    operations = [
        # Add is_email_verified to User
        migrations.AddField(
            model_name='user',
            name='is_email_verified',
            field=models.BooleanField(
                default=False,
                help_text='True once the user clicks the verification link sent to their email.',
                verbose_name='Email Verified',
            ),
        ),

        # Create EmailVerificationToken model
        migrations.CreateModel(
            name='EmailVerificationToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, unique=True, editable=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='email_verification_token',
                    to='accounts.user',
                )),
            ],
        ),
    ]
