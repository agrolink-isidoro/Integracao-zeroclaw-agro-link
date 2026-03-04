import pytest

from apps.comercial.models import Fornecedor, DocumentoFornecedor
from apps.comercial.serializers import FornecedorSerializer


@pytest.mark.django_db
def test_fornecedor_serializer_includes_nested_and_alias_fields():
    # Create a fornecedor with some fields
    fornecedor = Fornecedor.objects.create(
        nome='ACME Ltda',
        tipo_pessoa='pj',
        cpf_cnpj='12345678000199',
        telefone='555-1234',
        celular='555-5678',
        email='contato@acme.test',
        endereco='Rua A',
        numero='10',
        complemento='Sala 1',
        bairro='Centro',
        cidade='CidadeX',
        estado='ST',
        cep='12345-678',
        categoria='servicos',
        status='ativo'
    )

    # Attach a documento to test nested serialization
    DocumentoFornecedor.objects.create(
        fornecedor=fornecedor,
        tipo='contrato',
        titulo='Contrato 2026',
        numero='C-2026-01',
        status='ativo'
    )

    serialized = FornecedorSerializer(fornecedor)
    data = serialized.data

    # Basic fields
    assert data['id'] == fornecedor.id
    assert data['cpf_cnpj'] == fornecedor.cpf_cnpj

    # Aliases / derived
    assert data['categoria_fornecedor'] == fornecedor.categoria
    assert data['razao_social'] == fornecedor.nome
    assert data['nome_fantasia'] is None

    # Nested contato
    assert 'contato' in data
    assert data['contato']['telefone_principal'] == '555-1234'
    assert data['contato']['email_principal'] == 'contato@acme.test'

    # Endereco
    assert 'endereco' in data
    assert data['endereco']['cidade'] == 'CidadeX'

    # Documentos
    assert isinstance(data['documentos'], list)
    assert len(data['documentos']) == 1
    assert data['documentos'][0]['titulo'] == 'Contrato 2026'
