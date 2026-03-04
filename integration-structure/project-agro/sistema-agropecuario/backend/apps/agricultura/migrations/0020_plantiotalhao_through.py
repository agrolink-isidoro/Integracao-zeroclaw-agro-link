"""
Migration: Add PlantioTalhao through model with variedade field per talhão.

Steps:
  1. Create agricultura_plantiotalhao table (through model)
  2. Copy existing M2M data from agricultura_plantio_talhoes → agricultura_plantiotalhao
  3. AlterField Plantio.talhoes to use through='PlantioTalhao' (state only)
  4. Drop old implicit join table agricultura_plantio_talhoes
"""
from django.db import migrations, models
import django.db.models.deletion


def copy_talhoes_to_through(apps, schema_editor):
    """Copy rows from implicit M2M join table into new PlantioTalhao table."""
    with schema_editor.connection.cursor() as cursor:
        # Check old table exists (safety guard)
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'agricultura_plantio_talhoes'
            );
        """)
        exists = cursor.fetchone()[0]
        if exists:
            cursor.execute("""
                INSERT INTO agricultura_plantiotalhao (plantio_id, talhao_id, variedade)
                SELECT plantio_id, talhao_id, NULL
                FROM agricultura_plantio_talhoes;
            """)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('agricultura', '0019_cultura_unidade_producao_variedades'),
        ('fazendas', '0001_initial'),
    ]

    operations = [
        # 1. Create new explicit through table
        migrations.CreateModel(
            name='PlantioTalhao',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('variedade', models.CharField(
                    blank=True,
                    help_text='Variedade cultivada neste talhão nesta safra',
                    max_length=100,
                    null=True,
                    verbose_name='Variedade',
                )),
                ('plantio', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='plantio_talhoes',
                    to='agricultura.plantio',
                )),
                ('talhao', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='plantio_talhoes',
                    to='fazendas.talhao',
                )),
            ],
            options={
                'verbose_name': 'Talhão do Plantio',
                'verbose_name_plural': 'Talhões do Plantio',
                'unique_together': {('plantio', 'talhao')},
            },
        ),

        # 2. Copy existing M2M data before dropping old table
        migrations.RunPython(copy_talhoes_to_through, noop),

        # 3. Update Plantio.talhoes field state to use through model (state-only: no DDL)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='plantio',
                    name='talhoes',
                    field=models.ManyToManyField(
                        related_name='plantios',
                        through='agricultura.PlantioTalhao',
                        to='fazendas.talhao',
                        verbose_name='Talhões',
                    ),
                ),
            ],
            database_operations=[],
        ),

        # 4. Drop old implicit join table (now replaced by PlantioTalhao)
        migrations.RunSQL(
            sql='DROP TABLE IF EXISTS agricultura_plantio_talhoes;',
            reverse_sql='',
        ),
    ]
