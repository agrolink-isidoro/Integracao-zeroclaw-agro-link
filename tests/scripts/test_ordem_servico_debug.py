#!/usr/bin/env python
"""
Script de teste para debug detalhado do fluxo de Ordem de Serviço.
Rastreia cada passo do processo e registra tudo nos logs.
"""
import os
import sys
import django
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/app/backend')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from apps.maquinas.models import OrdemServico, Equipamento
from apps.estoque.models import Produto
import logging
import json

# Setup logging para capturar tudo
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

User = get_user_model()

def test_ordem_servico_debug():
    """
    Teste completo do fluxo de Ordem de Serviço com debugging extensivo.
    """
    print("\n" + "="*80)
    print("🔴 INICIANDO TESTE DE DEBUG - ORDEM DE SERVIÇO")
    print("="*80 + "\n")

    # Get user and client
    user = User.objects.get(username='isidoro_agent')
    client = Client()
    client.force_login(user)

    # Get or create equipamento
    try:
        eq = Equipamento.objects.first()
    except:
        print("❌ Nenhum equipamento encontrado!")
        return

    print(f"✅ Usando usuário: {user.username}")
    print(f"✅ Usando equipamento: {eq.nome} (id={eq.id})\n")

    # Get a produto for insumo
    try:
        produto = Produto.objects.all()[0]
    except:
        print("❌ Nenhum produto encontrado!")
        return

    print(f"✅ Usando produto: {produto.nome} (id={produto.id})\n")

    # =====================================================================
    # PASSO 1: CRIAR Ordem de Serviço com status 'aberta'
    # =====================================================================
    print("\n" + "-"*80)
    print("📝 PASSO 1: CRIANDO ORDEM DE SERVIÇO COM STATUS 'aberta'")
    print("-"*80)

    payload_criar = {
        "numero_os": f"DEBUG-{django.utils.timezone.now().timestamp()}",
        "equipamento": eq.id,
        "tipo": "preventiva",
        "prioridade": "media",
        "status": "aberta",  # ← status INICIAL
        "descricao_problema": "[TESTE DEBUG] Problema de teste",
        "data_previsao": None,
        "insumos": [
            {
                "produto_id": produto.id,
                "quantidade": 5.00,
                "valor_unitario": 100.00,
                "nome": produto.nome,
            }
        ],
        "custo_mao_obra": 0,
        "responsavel_execucao": None,
        "prestador_servico": None,
        "nfes": [],
        "observacoes": "[DEBUG] Teste",
    }

    print(f"📤 POST /maquinas/ordens-servico/")
    print(f"   status no payload: {payload_criar['status']}")
    print(f"   insumos no payload: {len(payload_criar['insumos'])} items")

    response = client.post(
        '/api/maquinas/ordens-servico/',
        data=json.dumps(payload_criar),
        content_type='application/json'
    )

    print(f"📥 Response status: {response.status_code}")
    
    if response.status_code not in (200, 201):
        print(f"❌ Erro ao criar! {response.content.decode()[:500]}")
        return

    dados_criacao = response.json()
    os_id = dados_criacao['id']
    status_criacao = dados_criacao['status']

    print(f"✅ Ordem criada!")
    print(f"   OS id: {os_id}")
    print(f"   status após criação: {status_criacao}")
    print(f"   insumos_reservados: {dados_criacao.get('insumos_reservados')}")
    print(f"   insumos count: {len(dados_criacao.get('insumos', []))}")

    # Verificar no banco
    os_obj = OrdemServico.objects.get(pk=os_id)
    print(f"\n🔍 Verificação no banco:")
    print(f"   status no banco: {os_obj.status}")
    print(f"   insumos_reservados: {os_obj.insumos_reservados}")

    # =====================================================================
    # PASSO 2: ATUALIZAR para 'em_andamento'
    # =====================================================================
    print("\n" + "-"*80)
    print("📝 PASSO 2: ATUALIZANDO PARA STATUS 'em_andamento'")
    print("-"*80)

    payload_atualizar = {
        "equipamento": eq.id,
        "status": "em_andamento",  # ← NOVO STATUS
        "tipo": "preventiva",
        "prioridade": "media",
        "descricao_problema": "[TESTE DEBUG] Problema de teste",
        "data_previsao": None,
        "insumos": [
            {
                "produto_id": produto.id,
                "quantidade": 5.00,
                "valor_unitario": 100.00,
                "nome": produto.nome,
            }
        ],
        "custo_mao_obra": 0,
        "responsavel_execucao": None,
        "prestador_servico": None,
        "nfes": [],
        "observacoes": "[DEBUG] Teste",
    }

    print(f"📤 PUT /maquinas/ordens-servico/{os_id}/")
    print(f"   status ANTERIOR: {os_obj.status}")
    print(f"   status no payload: {payload_atualizar['status']}")

    response = client.put(
        f'/api/maquinas/ordens-servico/{os_id}/',
        data=json.dumps(payload_atualizar),
        content_type='application/json'
    )

    print(f"📥 Response status: {response.status_code}")

    if response.status_code not in (200, 201):
        print(f"❌ Erro ao atualizar! {response.content.decode()[:500]}")
        return

    dados_update = response.json()
    status_apos_update = dados_update['status']

    print(f"✅ Ordem atualizada!")
    print(f"   status no response: {status_apos_update}")
    print(f"   ⚠️ ESPERADO: 'em_andamento'")
    if status_apos_update != 'em_andamento':
        print(f"   🔴 ERRO: Status é '{status_apos_update}' em vez de 'em_andamento'!")

    # Verificar no banco novamente
    os_obj.refresh_from_db()
    print(f"\n🔍 Verificação no banco APÓS UPDATE:")
    print(f"   status no banco: {os_obj.status}")
    print(f"   insumos_reservados: {os_obj.insumos_reservados}")

    if os_obj.status != 'em_andamento':
        print(f"   🔴 ERRO: Status no banco é '{os_obj.status}' em vez de 'em_andamento'!")

    # =====================================================================
    # PASSO 3: LISTAR E VERIFICAR
    # =====================================================================
    print("\n" + "-"*80)
    print("📝 PASSO 3: LISTANDO E VERIFICANDO")
    print("-"*80)

    response = client.get('/api/maquinas/ordens-servico/')
    print(f"📥 GET /maquinas/ordens-servico/ - status {response.status_code}")

    ordens = response.json()
    if isinstance(ordens, dict):
        ordens = ordens.get('results', [])

    nossa_ordem = next((o for o in ordens if o['id'] == os_id), None)
    
    if nossa_ordem:
        print(f"✅ Ordem encontrada na listagem")
        print(f"   status na listagem: {nossa_ordem['status']}")
        if nossa_ordem['status'] != 'em_andamento':
            print(f"   🔴 ERRO: Status é '{nossa_ordem['status']}' em vez de 'em_andamento'!")
    else:
        print(f"❌ Ordem NÃO encontrada na listagem??")

    # =====================================================================
    # RESUMO
    # =====================================================================
    print("\n" + "="*80)
    print("📋 RESUMO DO TESTE")
    print("="*80)
    print(f"Status inicial: aberta")
    print(f"Status após update (payload): em_andamento")
    print(f"Status no response: {status_apos_update}")
    print(f"Status no banco: {os_obj.status}")
    print(f"Status na listagem: {nossa_ordem['status'] if nossa_ordem else '???'}")
    
    if os_obj.status == 'em_andamento' and nossa_ordem and nossa_ordem['status'] == 'em_andamento':
        print(f"\n✅ TESTE PASSOU - Status está correto!")
    else:
        print(f"\n❌ TESTE FALHOU - Status está incorreto!")
        print(f"\nVERIFIQUE OS LOGS ACIMA PARA DETALHES!")

    print("="*80 + "\n")

if __name__ == '__main__':
    test_ordem_servico_debug()
