from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grounds', '0003_alter_ground_ground_size_alter_ground_ground_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ground',
            name='latitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name='Latitude',
                help_text='GPS latitude of the ground location.',
            ),
        ),
        migrations.AddField(
            model_name='ground',
            name='longitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name='Longitude',
                help_text='GPS longitude of the ground location.',
            ),
        ),
    ]
