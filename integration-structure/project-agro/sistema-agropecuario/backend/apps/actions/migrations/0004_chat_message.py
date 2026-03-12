from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("actions", "0003_expand_action_types"),
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("tenant", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="%(app_label)s_%(class)s_set",
                    to="core.tenant",
                )),
                ("criado_por", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="chat_messages",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("role", models.CharField(
                    choices=[("human", "Usuário"), ("ai", "Isidoro")],
                    max_length=10,
                )),
                ("content", models.TextField()),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "Mensagem de Chat",
                "verbose_name_plural": "Mensagens de Chat",
                "ordering": ["criado_em"],
            },
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(
                fields=["tenant", "criado_por", "criado_em"],
                name="actions_chatmsg_tenant_user_idx",
            ),
        ),
    ]
