from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0016_add_itemnfeoverride'),
        ('fiscal', '0024_add_auto_detect_cert_fields'),
    ]

    operations = [
        # This is a merge migration to resolve multiple heads in the fiscal migration history.
    ]
