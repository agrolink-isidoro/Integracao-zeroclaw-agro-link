# Generated migration to add RateioApproval
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('financeiro', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RateioApproval',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pendente'), ('approved', 'Aprovado'), ('rejected', 'Rejeitado')], default='pending', max_length=20)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('aprovado_em', models.DateTimeField(null=True, blank=True)),
                ('comentario', models.TextField(null=True, blank=True)),
                ('aprovado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rateios_aprovados', to=settings.AUTH_USER_MODEL)),
                ('criado_por', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rateios_aprovacao_solicitados', to=settings.AUTH_USER_MODEL)),
                ('rateio', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='approval', to='financeiro.rateiocusto')),
            ],
            options={
                'verbose_name': 'Solicitação de Aprovação de Rateio',
                'verbose_name_plural': 'Solicitações de Aprovação de Rateios',
                'ordering': ['-criado_em'],
            },
        ),
    ]
