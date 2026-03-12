# Generated migration: Add tenant field to Cultura model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_add_actions_permission_to_profiles'),
        ('agricultura', '0021_colheita_tenant_colheitatransporte_tenant_and_more'),
    ]

    operations = [
        # Step 1: Add tenant field with allow_null=True temporarily
        migrations.AddField(
            model_name='cultura',
            name='tenant',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='core.tenant'
            ),
        ),
        
        # Step 2: Set default tenant for existing records
        # This will be handled by a data migration or manual setup
        
        # Step 3: Remove unique constraint on nome
        migrations.AlterField(
            model_name='cultura',
            name='nome',
            field=models.CharField(max_length=100),
        ),
        
        # Step 4: Add unique_together constraint for (tenant, nome)
        migrations.AlterUniqueTogether(
            name='cultura',
            unique_together={('tenant', 'nome')},
        ),
    ]
