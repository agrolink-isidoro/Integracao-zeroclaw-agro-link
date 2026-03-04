from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.maquinas.models import OrdemServico, Equipamento
from django.contrib.auth import get_user_model

User = get_user_model()

class OrdemServicoModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.equip = Equipamento.objects.create(
            nome='Equip Test', categoria_id=1, ano_fabricacao=2020, data_aquisicao='2020-01-01', valor_aquisicao=1000
        )

    def test_data_conclusao_before_abertura_raises_validation_error(self):
        os = OrdemServico(
            equipamento=self.equip,
            tipo='corretiva',
            prioridade='media',
            status='aberta',
            descricao_problema='Teste',
            data_conclusao=timezone.now() - timezone.timedelta(days=10)
        )
        # Simulate abertura in future by setting data_abertura manually
        os.data_abertura = timezone.now() + timezone.timedelta(days=2)
        with self.assertRaises(ValidationError):
            os.full_clean()

    def test_full_clean_allows_valid_dates(self):
        os = OrdemServico(
            equipamento=self.equip,
            tipo='corretiva',
            prioridade='media',
            status='aberta',
            descricao_problema='Teste',
            data_conclusao=timezone.now() + timezone.timedelta(days=2),
            numero_os='TEST123'
        )
        # abertura is now
        os.data_abertura = timezone.now()
        # Should not raise
        os.full_clean()