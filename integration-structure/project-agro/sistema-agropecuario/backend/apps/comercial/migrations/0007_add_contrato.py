# Generated simple migration to add Contrato model
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('comercial', '0006_remove_legacy_fk_columns'),
    ]

    # NOTE: This migration was superseded by 0009_contrato_and_more.
    # To avoid duplicated CREATE TABLE operations during initial `migrate`,
    # keep this migration as a no-op (empty operations list).
    operations = []
