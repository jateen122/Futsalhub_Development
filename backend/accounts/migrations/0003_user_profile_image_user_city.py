# Generated migration — adds profile_image and city to accounts.User

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_user_options_alter_user_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='profiles/',
                verbose_name='Profile image',
                help_text="User's profile/avatar image.",
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='city',
            field=models.CharField(
                blank=True,
                default='',
                max_length=100,
                verbose_name='City',
                help_text='City where the user is based.',
            ),
        ),
    ]
