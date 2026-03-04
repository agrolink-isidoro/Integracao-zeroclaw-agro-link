# No-op placeholder migration to keep history consistent (deprecated)
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('agricultura', '0009_colheitatransporte'),
    ]
    operations = []

