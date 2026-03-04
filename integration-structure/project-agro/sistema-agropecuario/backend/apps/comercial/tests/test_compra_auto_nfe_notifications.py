import pytest
from django.utils import timezone
from django.core import mail
from unittest.mock import patch

from apps.comercial.models import Compra
from apps.fiscal.models import NFe
from apps.administrativo.models import Notificacao

pytestmark = pytest.mark.django_db


from apps.comercial.models import Fornecedor


def make_fornecedor_missing_fields(django_user_model):
    # create a Fornecedor with missing email and address fields
    user = django_user_model.objects.create(username='owner')
    fornecedor = Fornecedor.objects.create(
        nome='Fornecedor Teste',
        cpf_cnpj='00000000000000',
        criado_por=user,
    )
    # clear optional fields
    fornecedor.email = ''
    fornecedor.cep = ''
    fornecedor.endereco = ''
    fornecedor.cidade = ''
    fornecedor.estado = ''
    fornecedor.save()
    return fornecedor


def test_compra_creates_notificacao_and_sends_email_when_fornecedor_incomplete(client, django_user_model):
    fornecedor = make_fornecedor_missing_fields(django_user_model)

    # create a simple minimal XML for NFe with chave_acesso
    xml = """<?xml version='1.0' encoding='UTF-8'?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe>
        <infNFe Id="NFe0" versao="4.00">
          <ide>
            <cNF>0001</cNF>
          </ide>
          <dest>
            <CNPJ>00000000000000</CNPJ>
            <xNome>Fornecedor Teste</xNome>
          </dest>
        </infNFe>
      </NFe>
    </nfeProc>
    """

    # Create Compra instance but do not save yet so we can trigger post_save under patched context
    compra = Compra(data=timezone.now().date(), valor_total=0, xml_content=xml, fornecedor=fornecedor)

    # Patch NFe parsing helper to avoid needing full ICMSTot in minimal XML and patch email functions
    with patch('apps.fiscal.views.NFeViewSet._extract_nfe_data', return_value={
        'chave_acesso': '0'*44,
        'numero': '1',
        'serie': '001',
        'data_emissao': timezone.now(),
        'natureza_operacao': 'Operacao Teste',
        'tipo_operacao': '0',
        'destino_operacao': '1',
        'municipio_fato_gerador': '1234567',
        'tipo_impressao': '1',
        'tipo_emissao': '1',
        'finalidade': '1',
        'indicador_consumidor_final': '0',
        'indicador_presenca': '0',
        'versao_processo': '4.00',
        'emitente_nome': 'Emitente Teste',
        'destinatario_nome': 'Fornecedor Teste',
        'valor_produtos': 0,
        'valor_nota': 0,
        'valor_icms': 0,
        'valor_pis': 0,
        'valor_cofins': 0,
    }) as mock_extract, \
         patch('apps.fiscal.views.NFeViewSet._process_nfe_items', new=lambda self, proc_nfe, nfe_obj: None, create=True) as mock_process_items, \
         patch('django.core.mail.send_mail') as mock_send_mail, \
         patch('django.core.mail.mail_admins') as mock_mail_admins:
        # Trigger post_save by saving compra (signals run on post_save)
        compra.save()

        # Assert a Notificacao was created
        notifs = Notificacao.objects.filter(mensagem__icontains='Fornecedor')
        assert notifs.exists(), "Expected a Notificacao to be created when fornecedor is incomplete"

        # send_mail should NOT be called when fornecedor has no email; mail_admins SHOULD be called
        assert not mock_send_mail.called, "Did not expect send_mail when fornecedor has no email"
        assert mock_mail_admins.called, "Expected mail_admins to be called for admins"


def test_compra_sends_email_to_fornecedor_when_email_present(django_user_model):
    from apps.comercial.models import Fornecedor

    user = django_user_model.objects.create(username='owner2')
    fornecedor = Fornecedor.objects.create(
        nome='Fornecedor Com Email',
        cpf_cnpj='22222222222222',
        criado_por=user,
        email='fornecedor@example.com',
        cep='',
        endereco='',
        cidade='',
        estado='',
    )

    xml = """<?xml version='1.0' encoding='UTF-8'?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe>
        <infNFe Id="NFe0" versao="4.00">
          <ide>
            <cNF>0003</cNF>
          </ide>
          <dest>
            <CNPJ>22222222222222</CNPJ>
            <xNome>Fornecedor Com Email</xNome>
          </dest>
        </infNFe>
      </NFe>
    </nfeProc>
    """

    compra = Compra(data=timezone.now().date(), valor_total=0, xml_content=xml, fornecedor=fornecedor)

    with patch('apps.fiscal.views.NFeViewSet._extract_nfe_data', return_value={
        'chave_acesso': '1'*44,
        'numero': '2',
        'serie': '002',
        'data_emissao': timezone.now(),
        'natureza_operacao': 'Operacao Teste',
        'tipo_operacao': '0',
        'destino_operacao': '1',
        'municipio_fato_gerador': '1234567',
        'tipo_impressao': '1',
        'tipo_emissao': '1',
        'finalidade': '1',
        'indicador_consumidor_final': '0',
        'indicador_presenca': '0',
        'versao_processo': '4.00',
        'emitente_nome': 'Emitente Teste',
        'destinatario_nome': 'Fornecedor Com Email',
        'valor_produtos': 0,
        'valor_nota': 0,
        'valor_icms': 0,
        'valor_pis': 0,
        'valor_cofins': 0,
    }), patch('apps.fiscal.views.NFeViewSet._process_nfe_items', new=lambda self, proc_nfe, nfe_obj: None, create=True) as mock_process_items, patch('apps.fiscal.utils.validate_chave_acesso', return_value=True) as mock_validate, patch('django.core.mail.send_mail') as mock_send_mail, patch('django.core.mail.mail_admins') as mock_mail_admins:
        compra.save()

        notifs = Notificacao.objects.filter(mensagem__icontains='Fornecedor')
        assert notifs.exists(), "Expected a Notificacao to be created when fornecedor is incomplete"

        # send_mail should be called because fornecedor has an email
        assert mock_send_mail.called, "Expected send_mail to be called when fornecedor has email"
        # verify email recipient
        called_args = mock_send_mail.call_args[0]
        recipients = called_args[3] if len(called_args) > 3 else []
        assert 'fornecedor@example.com' in recipients
    fornecedor = Fornecedor.objects.create(
        nome='Fornecedor Completo',
        cpf_cnpj='11111111111111',
        criado_por=user,
        email='ok@example.com',
        cep='12345-678',
        endereco='Rua 1',
        cidade='Cidade',
        estado='UF',
    )

    xml = """<?xml version='1.0' encoding='UTF-8'?>
    <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
      <NFe>
        <infNFe Id="NFe0" versao="4.00">
          <ide>
            <cNF>0002</cNF>
          </ide>
          <dest>
            <CNPJ>11111111111111</CNPJ>
            <xNome>Fornecedor Completo</xNome>
          </dest>
        </infNFe>
      </NFe>
    </nfeProc>
    """

    compra = Compra.objects.create(data=timezone.now().date(), valor_total=0, xml_content=xml, fornecedor=fornecedor)
    compra.save()

    # Since fornecedor is complete, no notification mentioning this fornecedor should be created
    notifs = Notificacao.objects.filter(mensagem__icontains='Fornecedor Completo')
    assert not notifs.exists(), "Did not expect a notification when fornecedor is complete"
