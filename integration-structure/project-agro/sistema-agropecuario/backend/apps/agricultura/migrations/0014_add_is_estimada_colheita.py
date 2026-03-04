from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('agricultura', '0013_merge_20260102_1620'),
    ]

    operations = [
        migrations.AddField(
            model_name='colheita',
            name='is_estimada',
            field=models.BooleanField(default=True, verbose_name='Estimativa'),
        ),
    ]
