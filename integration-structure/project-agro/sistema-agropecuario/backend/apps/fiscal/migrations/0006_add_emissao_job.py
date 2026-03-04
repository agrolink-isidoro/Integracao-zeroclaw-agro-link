# Generated migration for EmissaoJob
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fiscal', '0005_merge_0003_0004'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmissaoJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('success', 'Success'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('protocolo', models.CharField(max_length=50, null=True, blank=True)),
                ('tentativa_count', models.PositiveIntegerField(default=0)),
                ('last_error', models.TextField(null=True, blank=True)),
                ('scheduled_at', models.DateTimeField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('nfe', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='emission_jobs', to='fiscal.nfe')),
            ],
            options={
                'verbose_name': 'Emissão Job',
                'verbose_name_plural': 'Emissão Jobs',
            },
        ),
    ]
