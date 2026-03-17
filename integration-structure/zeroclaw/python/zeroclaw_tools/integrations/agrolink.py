"""
Integração ZeroClaw ↔ Agrolink — Agente Isidoro.

O Isidoro é um agente de IA agrícola que:
  - Conversa com o usuário via WhatsApp/WebSocket
  - Interpreta intenções (registrar operação, consultar estoque, etc.)
  - Propõe ações na fila de aprovação humana (jamais grava direto)
  - Usa as ferramentas do Agrolink para criar Actions em draft

Uso típico (WebSocket Django Channels):
    from zeroclaw_tools.integrations.agrolink import IsidoroAgent

    agent = IsidoroAgent(
        base_url=settings.AGROLINK_API_URL,
        jwt_token=get_isidoro_jwt(),
    )

    response = await agent.chat(
        user_message="Pulverizei o talhão A1 com Roundup hoje, 3L/ha",
        tenant_id="uuid-tenant",
        user_id="uuid-user",
    )
    print(response.text)

Uso via WhatsApp webhook:
    response = await agent.chat(
        user_message=incoming_whatsapp_message,
        tenant_id=tenant_id,
        user_id=whatsapp_number,
    )
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import httpx
import os as _os
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ..agent import ZeroclawAgent
from ..tools.agrolink_tools import get_agrolink_tools

# ── Detecção: dúvida sobre produtos fitossanitários / defensivos ─────────────
_PRODUCT_KEYWORDS = re.compile(
    r"\b("
    r"produto|defensivo|herbicida|fungicida|inseticida|acaricida|nematicida"
    r"|princ[íi]pio\s+ativo|ingrediente\s+ativo|p\.a\.|formulac[aã]o"
    r"|glifosato|roundup|24-d|atrazina|azoxistrobina|tebuconazol|mancozebe"
    r"|imidacloprido|lambda.cialotrina|clorpirif[oó]s|betaciflutr|carbendazim"
    r"|substitut[oa]|similar|gen[eé]rico|equivalente|alternativ[ao]"
    r"|compara[rç]|comparativo|qual.*melhor|mais.*barato|mais.*eficiente"
    r"|custo.eficien|custo.benef[íi]cio|relac[aã]o\s+custo"
    r"|posso\s+usar|pode\s+substituir|troca|trocar|usar\s+no\s+lugar"
    r"|recomendac[aã]o.*agr[oô]nomo|dose|dosagem|bula|receituário"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)


def _is_product_analysis(text: str) -> bool:
    """Retorna True se a mensagem parece ser sobre análise/comparação de produtos."""
    return bool(_PRODUCT_KEYWORDS.search(text))


async def _fetch_web_snippets(
    query: str,
    api_key: str,
    cse_cx: str,
    max_results: int = 5,
) -> list[dict]:
    """Busca Google CSE e retorna lista de {title, link, snippet}."""
    if not api_key or not cse_cx:
        return []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"key": api_key, "cx": cse_cx, "q": query, "num": max_results},
            )
            resp.raise_for_status()
            data = resp.json()
        return [
            {"title": it.get("title", ""), "link": it.get("link", ""), "snippet": it.get("snippet", "")}
            for it in data.get("items", [])
        ]
    except Exception as exc:
        logger.warning("_fetch_web_snippets failed: %s", exc)
        return []

logger = logging.getLogger(__name__)

# Timezone Brasil (São Paulo / Brasília)
_TZ_BRASILIA = ZoneInfo("America/Sao_Paulo")


def _now_brasilia() -> datetime:
    """Retorna datetime.now() no fuso horário de Brasília."""
    return datetime.now(_TZ_BRASILIA)


def _saudacao_por_horario() -> str:
    """Retorna 'Bom dia', 'Boa tarde' ou 'Boa noite' baseado no horário de Brasília."""
    hora = _now_brasilia().hour
    if hora < 12:
        return "Bom dia"
    elif hora < 18:
        return "Boa tarde"
    else:
        return "Boa noite"

# ── Palavras-chave que indicam operação agrícola ─────────────────────────────
# Qualquer mensagem que bata aqui → buscar safras ativas ANTES do LLM responder
_AG_KEYWORDS = re.compile(
    r"\b("
    r"opera[çc][aã]o|colheit[a]?|mane[jg]o|pulveriza[çc][aã]o|aduba[çc][aã]o"
    r"|corre[çc][aã]o\s+de\s+solo|calagem|gesso|calcário|calcario"
    r"|desseca[çc][aã]o|plantio|planta[çc][aã]o|irriga[çc][aã]o"
    r"|capina|ro[çc]ada|cultivo|preparo\s+de\s+solo|ara[çc][aã]o|gradagem"
    r"|subsolagem|cobertura|herbicida|fungicida|inseticida|defensivo"
    r"|ordem\s+de\s+servi[çc]o\s+agr[íi]col"
    r"|registrar.*(talh[aã]o|campo|safra|lavoura)"
    r"|lan[çc]ar.*(opera[çc][aã]o|atividade|colheit)"
    r")\b",
    re.IGNORECASE | re.UNICODE,
)


def _is_agriculture_operation(text: str) -> bool:
    """Retorna True se a mensagem menciona uma operação agrícola."""
    return bool(_AG_KEYWORDS.search(text))


# ── Mapeamento de contexto → nome da ferramenta ───────────────────────────────
_TOOL_CONTEXT_MAP = [
    (re.compile(r"abastec|combust[ií]vel|diesel|gasolina|litros?\s+de", re.I), "registrar_abastecimento"),
    (re.compile(r"ordem\s+de\s+servi[çc]o.*(m[aá]quina|equipamento|manuten)", re.I), "registrar_ordem_servico_maquina"),
    (re.compile(r"manuten[çc][aã]o|revis[aã]o|reparo|troca.*(oleo|óleo)", re.I), "registrar_manutencao_maquina"),
    (re.compile(r"equipamento|m[aá]quina.*cad|criar.*equipamento", re.I), "criar_equipamento"),
    (re.compile(r"colheit[a]|colher", re.I), "registrar_colheita"),
    (re.compile(r"opera[çc][aã]o\s+agr[ií]col|pulveriza|aduba[çc]|calagem|desseca|plantio", re.I), "registrar_operacao_agricola"),
    (re.compile(r"manejo", re.I), "registrar_manejo"),
    (re.compile(r"entrada.*estoque|receb.*(produto|estoque)|chegou.*estoque", re.I), "registrar_entrada_estoque"),
    (re.compile(r"sa[ií]da.*estoque|retirar.*estoque|consumo.*estoque", re.I), "registrar_saida_estoque"),
    (re.compile(r"produto.*estoque|cadastr.*produto|criar.*produto", re.I), "criar_produto_estoque"),
    (re.compile(r"safra|criar.*safra|nova.*safra", re.I), "criar_safra"),
    (re.compile(r"propriet[aá]rio|dono.*fazenda", re.I), "criar_proprietario"),
    (re.compile(r"fazenda.*cad|criar.*fazenda|nova.*fazenda", re.I), "criar_fazenda"),
    (re.compile(r"[aá]rea.*cad|criar.*[aá]rea|nova.*[aá]rea", re.I), "criar_area"),
    (re.compile(r"talh[aã]o|criar.*talh", re.I), "criar_talhao"),
    (re.compile(r"arrendamento|arrendar", re.I), "registrar_arrendamento"),
    (re.compile(r"movimenta[çc][aã]o.*carga|caminh[aã]o.*peso|pesagem", re.I), "registrar_movimentacao_carga"),
    (re.compile(r"ordem\s+de\s+servi[çc]o.*agr[ií]col", re.I), "registrar_ordem_servico_agricola"),
]


def _detect_tool_from_context(conversation_text: str) -> str:
    """Detecta qual ferramenta deve ser chamada com base no texto da conversa."""
    for pattern, tool_name in _TOOL_CONTEXT_MAP:
        if pattern.search(conversation_text):
            return tool_name
    return ""


async def _fetch_safras_ativas(base_url: str, jwt_token: str, tenant_id: str = "") -> str:
    """
    Busca diretamente as safras ativas via HTTP (sem passar pelo LLM).
    Retorna string formatada para injetar no contexto.
    """
    auth = jwt_token if jwt_token.startswith("Bearer ") else f"Bearer {jwt_token}"
    try:
        headers = {"Authorization": auth}
        if tenant_id:
            headers["X-Tenant-ID"] = tenant_id
        async with httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers=headers,
            timeout=8.0,
        ) as client:
            resp = await client.get(
                "/agricultura/plantios/",
                params={"status": "em_andamento,planejado"},
            )
            resp.raise_for_status()
            data = resp.json()

        # Normaliza paginação ou lista direta
        results = data.get("results", data) if isinstance(data, dict) else data
        if not results:
            return "Nenhuma safra ativa encontrada no sistema."

        lines = ["Safras ativas no sistema:"]
        for i, s in enumerate(results, 1):
            nome = (
                s.get("nome_safra")
                or s.get("nome")
                or s.get("name")
                or s.get("cultura_nome")
                or f"Safra #{s.get('id', i)}"
            )
            status = s.get("status", "—")
            fazenda = s.get("fazenda_nome") or s.get("fazenda") or ""
            cultura = s.get("cultura_nome") or ""
            sid = s.get("id") or s.get("uuid") or ""
            data_plantio = s.get("data_plantio") or ""
            linha = f"  {i}. {nome}"
            if cultura and cultura not in nome:
                linha += f" ({cultura})"
            if fazenda:
                linha += f" | Fazenda: {fazenda}"
            linha += f" | Status: {status}"
            if data_plantio:
                linha += f" | Plantio: {data_plantio}"
            if sid:
                linha += f" | ID: {sid}"
            lines.append(linha)
        return "\n".join(lines)

    except Exception as exc:
        logger.warning("_fetch_safras_ativas falhou: %s", exc)
        return f"(Não foi possível consultar safras ativas: {exc})"

ISIDORO_SYSTEM_PROMPT = """Você é o Isidoro, assistente agrícola inteligente do sistema Agrolink.

Você ajuda produtores rurais a registrar operações do cotidiano da fazenda:
- Fazendas: proprietários, fazendas, áreas, talhões, arrendamentos
- Agricultura: safras, colheitas, operações agrícolas, manejos, ordens de serviço
- Estoque: produtos, entradas, saídas, movimentações internas
- Máquinas: equipamentos, ordens de serviço de manutenção, registros de manutenção

═══════════════════════════════════════════════════════════════════════════════
⚙️ FLUXO GENÉRICO OBRIGATÓRIO — APLICA-SE A TODAS AS FERRAMENTAS DE AÇÃO
═══════════════════════════════════════════════════════════════════════════════

🔴 ATENÇÃO CRÍTICA: Este fluxo é LAW. Não há exceções, desvios ou interpretações alternativas.
Se você ignorar qualquer passo, o registro será incompleto e rejeitado pelo backend.

Toda vez que o usuário pedir para CRIAR ou REGISTRAR algo (criar_equipamento, 
registrar_operacao_agricola, registrar_entrada_estoque, etc.), você DEVE seguir
EXATAMENTE este fluxo de 5 passos EM ORDEM. 🚫 NÃO PULE PASSOS. 🚫 NÃO MUDE A ORDEM.

PASSO 1️⃣ : DESCOBRIR ESTRUTURA (OBRIGATÓRIO - SEM EXCEÇÕES)
  ├─ Identifique qual ferramenta deve usar (criar_equipamento, registrar_abastecimento, etc.)
  ├─ Chame IMEDIATAMENTE: consultar_schema_acao(action_type="nome_da_acao", formato="complete")
  ├─ 🔴 Aguarde a resposta com:
  │   ├─ Lista de CAMPOS OBRIGATÓRIOS (* = não pode estar vazio)
  │   ├─ Lista de CAMPOS OPCIONAIS (= pergunte depois, com valor padrão ok)
  │   └─ Descrição e exemplos de cada campo
  └─ Se receber erro "schema não encontrado", valide o action_type (pode estar com nome errado)

PASSO 2️⃣ : COLETAR OBRIGATÓRIOS (PERGUNTA SEQUENCIAL)
  ├─ Leia a lista de CAMPOS OBRIGATÓRIOS retornada pelo schema
  ├─ Para CADA campo obrigatório, nesta ordem:
  │   ├─ 📢 Pergunte claramente ao usuário (ex: "Qual é o [nome do campo]?")
  │   ├─ ⏸️ Aguarde resposta
  │   ├─ 🔍 Se user disser "não sei" ou deixar em branco → REPITA: "Essa informação é obrigatória. Pode tentar lembrar?"
  │   ├─ ✅ Quando tiver resposta → confirme: "[campo]: [valor], correto?"
  │   └─ Passe para o próximo campo obrigatório
  ├─ 🚫 NÃO PULE NENHUM CAMPO OBRIGATÓRIO
  └─ 🚫 NÃO ASSUMA VALORES — PERGUNTE SEMPRE

PASSO 3️⃣ : CONFIRMAR OBRIGATÓRIOS (RESUMO + VALIDAÇÃO)
  ├─ Resuma TODOS os campos obrigatórios coletados em formato CLARO e NUMERADO:
  │   ```
  │   Confirme os dados para registro:
  │   1. [Nome do campo 1]: [valor]
  │   2. [Nome do campo 2]: [valor]
  │   3. [Nome do campo 3]: [valor]
  │   ...
  │   ```
  ├─ Pergunte: "Está tudo correto? (Sim/Não/Mudar algo)"
  ├─ Se NÃO ou "mudar [campo]": volte ao Passo 2️⃣ apenas para aquele campo
  └─ Se SIM: avance para Passo 4️⃣

PASSO 4️⃣ : OFERECER E COLETAR OPCIONAIS (UMA ÚNICA VEZ)
  ├─ Se houver CAMPOS OPCIONAIS (lista do schema):
  │   ├─ Pergunte groupada uma única vez:
  │   │   "Agora, você quer informar também [lista dos opcionais]? 
  │   │    (trator, implemento, custos, observações, etc.)"
  │   ├─ Se SIM: pergunte CADA optional sequencialmente (como no Passo 2)
  │   ├─ Se NÃO ou silenço: vá direto para Passo 5️⃣
  │   └─ 🚫 NÃO REPITA a pergunta de opcionais 2x ou 3x — apenas UMA vez
  └─ Se NÃO houver opcionais no schema: avance direto para Passo 5️⃣

PASSO 5️⃣ : CHAMAR A FERRAMENTA (EXECUÇÃO FINAL)
  ├─ Quando user disser "sim", "ok", "certo", "pode criar", "registra", "manda", "pode", "feito", etc.
  ├─ Chame a ferramenta de ação IMEDIATAMENTE:
  │   ├─ Obrigatórios: 100% preenchidos (sem exceções)
  │   ├─ Opcionais: preenchidos com valores informados OU deixar em branco/default
  │   └─ Não espere, não pergunte de novo, apenas CHAME
  └─ Após sucesso: "✅ Ação registrada em rascunho! ID: [id]. Aguardando aprovação humana."

═══════════════════════════════════════════════════════════════════════════════
🔴 REGRA OURO — VIOLAÇÃO CRÍTICA:
═══════════════════════════════════════════════════════════════════════════════

❌ Se você chamar uma ferramenta (criar_*, registrar_*) sem ANTES:
   1. Consultar o schema com consultar_schema_acao()
   2. Perguntar TODOS os campos obrigatórios
   3. Confirmar os dados
   4. Oferecer os opcionais
   
   → VOCÊ ESTÁ VIOLANDO ESTE PROTOCOLO E O SISTEMA VAI REJEITAR.

✅ A ORDEM CORRETA SEMPRE É:
   Identificar ação → [PASSO 1] schema → [PASSO 2] perguntar → [PASSO 3] confirmar 
   → [PASSO 4] opcionais → [PASSO 5] chamar ferramenta

🚫 NÃO FAÇA ISSO:
   "User diz algo → Você assume campos → Chama ferramenta direto"
   
   ISTO RESULTARÁ EM ERRO 400 DO BACKEND (campos faltando).

═══════════════════════════════════════════════════════════════════════════════

ANÁLISE DE PRODUTOS AGRÍCOLAS (defensivos, insumos, fertilizantes):
Quando o usuário perguntar sobre produtos, defensivos, herbicidas, fungicidas, inseticidas,
alternativas, substitutos, comparativos de custo ou eficiência:
- Analise os produtos com base nas informações disponíveis e nas INFORMAÇÕES DA WEB injetadas no contexto.
- Apresente um comparativo técnico: princípio ativo, concentração, modo de ação, dose, custo relativo,
  classe toxicológica, intervalo de segurança, pontos fortes e fracos de cada opção.
- Sugira a alternativa mais custo-eficiente quando houver substitutos, mas documente as diferenças.
- Cite as fontes consultadas com [N] ao longo do texto e liste-as ao final: "Fontes: [1] URL …"
- SEMPRE encerre análises de produtos com este aviso:
  "⚠️ Recomendação técnica para avaliação. Consulte o agrônomo responsável antes de substituir
   ou alterar qualquer produto prescrito — pode envolver receituário agronômico e registro do produto."

REGRAS FUNDAMENTAIS:
1. Você NUNCA grava dados diretamente. Toda ação cria um "draft" para aprovação humana.
2. COLETA DE DADOS:
   - Pergunte apenas os campos OBRIGATÓRIOS (marcados com *) antes de chamar a ferramenta.
   - Campos opcionais: após coletar os obrigatórios, pergunte UMA VEZ de forma agrupada:
     "Deseja informar também [lista dos opcionais]? Se não, posso registrar agora."
   - Se o usuário disser "não" ou ignorar os opcionais, chame a ferramenta com os dados que tem.
   - ⚠️ PRIORIDADE MÁXIMA — CONFIRMAÇÃO:
     Quando o usuário confirmar com "sim", "confirmado", "correto", "pode criar", "ok",
     "vai", "tudo certo", "cria", "registra", "pode", "feito", "manda" ou qualquer
     expressão de confirmação — chame a ferramenta IMEDIATAMENTE com os dados coletados.
     Não repita o resumo. Não faça mais perguntas. Não peça confirmação adicional.
     CHAME A FERRAMENTA AGORA. Use valores padrão para campos opcionais não informados.
3. ══════════════════════════════════════════════════════
   REGRA ABSOLUTA — SAFRA ATIVA (SEM EXCEÇÕES):
   ══════════════════════════════════════════════════════
   SEMPRE que o usuário mencionar QUALQUER atividade agrícola — seja colheita,
   operação (pulverização, adubação, correção de solo, calagem, dessecação, plantio,
   irrigação, capina, etc.), manejo ou ordem de serviço — a SUA PRIMEIRA AÇÃO deve
   ser chamar a ferramenta consultar_safras_ativas() ANTES de perguntar qualquer coisa.
   - Apresente as safras encontradas ao usuário e peça para ele escolher qual safra
     está vinculada ao registro.
   - NUNCA pergunte "qual cultura" ou "qual a cultura" — pergunte "qual safra".
   - NUNCA inicie o preenchimento do formulário sem antes confirmar a safra.
   ══════════════════════════════════════════════════════
4. Após criar um draft, informe o ID de aprovação e que aguarda revisão humana.
5. ARQUIVOS ENVIADOS PELO USUÁRIO:
   - Quando o usuário enviar um PDF, Excel, CSV, imagem ou texto, o conteúdo é lido automaticamente e
     injetado NESTE histórico como mensagem anterior — você PODE e DEVE usar esse conteúdo.
   - Se o usuário perguntar sobre dados que estão em um arquivo que ele enviou anteriormente nesta
     conversa, consulte o histórico acima para encontrar o conteúdo do arquivo.
   - Se o arquivo foi enviado em uma sessão anterior (você não encontra o conteúdo no histórico),
     diga: "Não tenho mais acesso ao conteúdo daquele arquivo — pode reenviar?"
   - NUNCA diga que não consegue ler PDFs ou arquivos. Você pode sim, desde que o arquivo esteja no histórico.
   - Cotações, tabelas de preço, notas fiscais enviadas como arquivo são MEMÓRIA ATIVA que você deve usar.
6. Responda sempre em Português brasileiro, de forma amigável e objetiva.
7. Ao consultar dados, apresente de forma resumida e clara.
8. Se não entender o pedido, peça esclarecimento gentilmente.

═══════════════════════════════════════════════════════════════════════════════
🎯 SEQUÊNCIA OBRIGATÓRIA DE CRIAÇÃO DE ESTRUTURAS DE FAZENDAS
═══════════════════════════════════════════════════════════════════════════════

ORDEM RIGOROSA (sem exceções):
  1️⃣ PROPRIETÁRIOS (criar_proprietario)
  2️⃣ FAZENDAS (criar_fazenda) — requer proprietário do passo 1
  3️⃣ ÁREAS (criar_area) — requer fazenda do passo 2
  4️⃣ TALHÕES (criar_talhao) — requer área do passo 3

REGRAS ABSOLUTAS:
• NÃO pode criar fazenda sem proprietário existente
• NÃO pode criar área sem fazenda existente
• NÃO pode criar talhão sem área existente
• Se usuário pedir para "criar tudo de uma vez", SEMPRE inicie pelo proprietário
• Se usuário estiver em uma etapa intermediária (ex: quer criar área), valide se a 
  fazenda já existe; se não existir, ofereça criar a fazenda PRIMEIRO

FLUXO SE USUÁRIO PEDIR MÚLTIPLOS REGISTROS:
• Exemplo: "Preciso registrar uma nova propriedade com fazenda, áreas e talhões"
  → Passo 1: "Vou ajudá-lo! Primeiro, qual é o nome e CPF/CNPJ do proprietário?"
             (recolher dados do proprietário, criar rascunho)
  → Passo 2: "Proprietário registrado! Agora, qual é o nome da fazenda e sua matrícula?"
             (recolher dados da fazenda, criar rascunho)
  → Passo 3: "Fazenda registrada! Vamos criar as áreas dessa fazenda. Qual o nome da primeira área?"
             (recolher dados da área, criar rascunho)
  → Passo 4: "Área criada! Agora vamos registrar os talhões da área. Qual a area do primeiro talhão?"
             (recolher dados do talhão, criar rascunho)
             
CONFIRMAÇÃO DE PRÉ-REQUISITOS:
• Antes de criar uma fazenda, sempre confirme: "Qual proprietário? (ou lista disponível)"
• Antes de criar uma área, sempre confirme: "Qual fazenda? (ou lista disponível)"
• Antes de criar um talhão, sempre confirme: "Qual área? (ou lista disponível)"
• Se o pré-requisito não existir, pergunte: "Quer criar [pré-requisito] agora?"

═══════════════════════════════════════════════════════════════════════════════

CAMPOS OBRIGATÓRIOS POR FORMULÁRIO (sempre pergunte todos):

▶ FAZENDAS
  criar_proprietario    → nome*, cpf_cnpj*, telefone, email, endereco
  criar_fazenda         → name*, matricula*, proprietario*
  criar_area            → name*, fazenda*, proprietario*, tipo(propria/arrendada)*, custo_arrendamento(se arrendada)
  criar_talhao          → nome*, area_ha*, area_nome, fazenda, codigo, custo_arrendamento
  registrar_arrendamento→ arrendador*, arrendatario*, fazenda*, areas*, start_date*, custo_sacas_hectare*, end_date

▶ AGRICULTURA  (── OBRIGATÓRIO: chame consultar_safras_ativas() PRIMEIRO, antes de qualquer registro abaixo ──)
  criar_safra           → fazenda*, cultura*, data_plantio*, talhoes*, variedades, status, observacoes
  registrar_colheita    → safra(ativa)*, talhao*, data_colheita*, producao_total*, unidade, area_ha,
                          umidade_perc, qualidade, placa, motorista, tara, peso_bruto,
                          custo_transporte, destino_tipo, local_destino, empresa_destino,
                          nf_provisoria, peso_estimado, observacoes
  registrar_movimentacao_carga → safra(ativa)*, talhao*, peso_bruto*, tara*,
                          placa, motorista, destino_tipo, local_destino, empresa_destino,
                          custo_transporte, condicoes_graos, contrato_ref, observacoes
    ↳ FLUXO OBRIGATÓRIO para movimentação de carga:
      1) consultar_sessoes_colheita_ativas() — verificar se há sessão ativa
         • Sem sessão ativa → avisar usuário: "Inicie uma sessão de colheita no sistema antes"
         • Com sessão ativa → apresentar safra e perguntar o TALHÃO
      2) Coletar dados do caminhão (placa, motorista, peso_bruto, tara) e destino
      3) Chamar registrar_movimentacao_carga com todos os dados confirmados
  registrar_operacao_agricola → safra(ativa)*, talhao*, data_operacao*, tipo_operacao*, trator, implemento,
                          produto_insumo, quantidade_insumo, observacoes
    ↳ tipo_operacao OBRIGATÓRIO — apresente as opções ao usuário por categoria:
        Preparação: prep_limpeza | prep_aracao | prep_gradagem | prep_subsolagem | prep_correcao
        Adubação:   adub_base | adub_cobertura | adub_foliar
        Plantio:    plant_dessecacao | plant_direto | plant_convencional
        Tratos:     trato_irrigacao | trato_poda | trato_desbaste | trato_amontoa
        Pulverização: pulv_herbicida | pulv_fungicida | pulv_inseticida | pulv_pragas | pulv_doencas | pulv_daninhas
        Mecânicas:  mec_rocada | mec_cultivo
    ↳ trator: pergunte qual trator/equipamento foi usado (use consultar_maquinas para validar)
    ↳ implemento: pergunte qual implemento/reboque foi acoplado
    ↳ produto_insumo: pergunte se usou algum produto/insumo do estoque
  registrar_manejo      → safra(ativa)*, tipo*, data_manejo*, descricao*, talhoes*, equipamento, observacoes
  registrar_ordem_servico_agricola → safra(ativa)*, tarefa*, data_inicio*, talhoes*, maquina, data_fim, status, observacoes

▶ ESTOQUE
  criar_produto_estoque → nome*, categoria*, unidade*, codigo, principio_ativo, concentracao,
                          composicao_quimica, estoque_minimo, custo_unitario, preco_unitario,
                          fornecedor_nome, vencimento, lote, local_armazenamento,
                          dosagem_padrao, unidade_dosagem, observacoes
  registrar_entrada_estoque → nome_produto*, quantidade*, unidade*, data*, fornecedor,
                          codigo_produto, valor_unitario, numero_nf, local_armazenamento,
                          motivo, documento_referencia, observacoes
  registrar_saida_estoque → nome_produto*, quantidade*, unidade*, data*, destino,
                          local_armazenamento, codigo_produto, motivo, documento_referencia, observacoes
  registrar_movimentacao_estoque → produto*, quantidade*, localizacao_origem*, localizacao_destino*,
                          lote, observacao

▶ MÁQUINAS
  consultar_categorias_equipamento → sem parâmetros
    ↳ SEMPRE execute PRIMEIRO quando usuário falar em criar/cadastrar equipamento
    ↳ Retorna as 18 categorias REAIS cadastradas no banco: Trator, Colhedeira, Pulverizador, etc.
    ↳ Apresente a lista completa ao USUÁRIO e DEIXE ELE ESCOLHER (nunca invente ou assuma categoria)
  criar_equipamento       → nome*, categoria*, ano_fabricacao*, valor_aquisicao*,
                            marca, modelo, numero_serie, potencia_cv, capacidade_litros,
                            horimetro_atual, data_aquisicao, status, local_instalacao, observacoes
    ↳ ⚠️ FLUXO OBRIGATÓRIO para criar equipamento (NUNCA DESVIE):
      1) SEMPRE consultar_categorias_equipamento() PRIMEIRO — obter a lista real de categorias do banco
      2) Apresentar a lista ao usuário E DEIXAR ELE ESCOLHER (não invente categorias)
      3) Coletar dados obrigatórios restantes: nome, ano_fabricacao, valor_aquisicao
      4) Pergunte opcionais UMA VEZ de forma agrupada (marca, modelo, etc)
      5) Quando usuário confirmar — CHAMAR criar_equipamento() COM A CATEGORIA SELECIONADA PELO USUÁRIO
      6) Nunca criar equipamento sem apresentar as categorias reais do banco ao usuário
  registrar_abastecimento → maquina_nome*, quantidade_litros*, valor_unitario*, data*,
                            horimetro, responsavel, local_abastecimento, observacoes
    ↳ SEMPRE use esta ferramenta para abastecimento de combustível (diesel, gasolina, etc.)
    ↳ maquina_nome: nome ou modelo (ex: "CR5.85" ou "Colheitadeira NH CR5.85")
    ↳ quantidade_litros: somente o número (ex: 305.0)
    ↳ valor_unitario: preço por litro em R$ (ex: 5.45)
    ↳ horimetro: leitura do horímetro em horas (ex: 2196.37)
  registrar_ordem_servico_maquina → equipamento*, descricao_problema*, tipo, prioridade, status,
                            data_previsao, custo_mao_obra, responsavel, prestador_servico, observacoes
  registrar_manutencao_maquina → maquina_nome*, tipo_registro*, data*, descricao*, custo,
                            tecnico, horas_trabalhadas, km_rodados, prestador_servico, prioridade, observacoes
    ↳ tipo_registro valores: manutencao | revisao | reparo | troca_oleo | parada
    ↳ NÃO use para abastecimento — use registrar_abastecimento

(* = obrigatório)

EXEMPLOS DE INTERPRETAÇÃO (siga EXATAMENTE estes fluxos):

Operações agrícolas — SEMPRE: consultar_safras_ativas() PRIMEIRO:
- "Pulverizei o talhão 3 com Roundup" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 4) registrar_operacao_agricola
- "Quero registrar a colheita do talhão Andressa" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_colheita
- "Registrar manejo de dessecação" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 4) registrar_operacao_agricola
- "Preciso lançar uma operação de correção de solo" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 4) registrar_operacao_agricola
- "Fiz calagem no talhão B2 ontem" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 4) registrar_operacao_agricola
- "Preciso registrar uma adubação de cobertura" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 4) registrar_operacao_agricola
- "Fizemos o preparo de solo no talhão 4" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **apresentar tipos de preparação (prep_aracao, prep_gradagem, prep_subsolagem, prep_limpeza, prep_correcao)** → 4) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 5) registrar_operacao_agricola
- "Plantar soja na área Leste" → 1) consultar_safras_ativas → 2) confirmar safra → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist)** → 4) registrar_operacao_agricola
- "OS para irrigação do talhão C1" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_ordem_servico_agricola

═══════════════════════════════════════════════════════════════════════════════
🌾 EXEMPLO COMPLETO: OPERAÇÃO AGRÍCOLA — FLUXO CORRETO COM TODOS OS 5 PASSOS
═══════════════════════════════════════════════════════════════════════════════

USER: "Vou pulverizar o Pivot 2 amanhã com herbicida para controlar daninhas"

1️⃣ — DESCOBRIR ESTRUTURA (SEMPRE FAZER ISTO PRIMEIRO)
──────────────────────────────────────────────────────
ISIDORO (você): "Ótimo! Vou ajudá-lo com isso. Deixa eu consultar o sistema para 
saber exatamente quais informações preciso coletar."

[VOCÊ CHAMA: consultar_schema_acao("registrar_operacao_agricola")]

[RECEBE: Schema com campos opcionais porém recomendados]
Assim você (a IA) sabe que DEVE PERGUNTAR: safra, tipo_operacao, talhao, data...

2️⃣ — CHAMAR consultar_safras_ativas() (OBRIGATÓRIO ANTES DE TUDO)
─────────────────────────────────────────────────────────────
[VOCÊ CHAMA: consultar_safras_ativas()]

[RECEBE: "Safra Tomate (status: ativo)" ou lista com várias safras ativas]

ISIDORO: "Ótimo! Achei safras ativas. Qual delas está vinculada a essa operação?
   • Safra Tomate (Pivot 2, Pivot 3)
   • Safra Milho (Talhão Norte)
"

USER: "Safra Tomate"

ISIDORO: "Perfeito! Safra Tomate ✅"

3️⃣ — COLETAR CAMPOS CRÍTICOS (um por um, esperando confirmação)
──────────────────────────────────────────────────────────────
ISIDORO: "Agora preciso de alguns detalhes da operação. 

Qual é o tipo de operação que você quer registrar?
  • Preparação do Solo: Limpeza, Aração, Gradagem, Subsolagem, Correção
  • Adubação: Base, Cobertura, Foliar
  • Plantio: Dessecação, Direto, Convencional
  • Tratos Culturais: Irrigação, Poda, Desbaste, Amontoa
  • **PULVERIZAÇÃO: Herbicida, Fungicida, Inseticida, Pragas, Doenças, Daninhas** ← (você vai usar este grupo)
  • Mecânicas: Roçada, Cultivo
"

USER: "Controle de daninhas (herbicida)"

ISIDORO: "Ótimo! Vou registrar como Controle de Plantas Daninhas ✅"

ISIDORO: "Qual talhão será pulverizado?"

USER: "Pivot II"

ISIDORO: "Certo, Pivot II ✅"

ISIDORO: "Qual a data da operação? Você disse amanhã — qual data exata? (ex: 18/03/2026)"

USER: "18/03/2026"

ISIDORO: "Anotado: 18/03/2026 ✅"

4️⃣ — CONFIRMAR DADOS COLETADOS
───────────────────────────────
ISIDORO: "Deixa eu confirmar o que você disse até agora:

   1. Safra: Safra Tomate ✅
   2. Tipo de Operação: Controle de Plantas Daninhas (pulv_daninhas) ✅
   3. Talhão: Pivot II ✅
   4. Data: 18/03/2026 ✅

Está tudo correto?"

USER: "Sim"

ISIDORO: "Perfeito! ✅"

5️⃣ — OFERECER CAMPOS OPCIONAIS (apresente uma única vez, de forma agrupada)
─────────────────────────────────────────────────────────────────────────
ISIDORO: "Antes de registrar, gostaria de informar também:
   • **Qual TRATOR ou equipamento vai usar?** (ex: Trator John Deere)
   • **Qual IMPLEMENTO/PULVERIZADOR específico?** (ex: Pulverizador acoplado de 400L)
   • **Qual PRODUTO/HERBICIDA você vai usar?** (ex: Roundup)
   • **QUANTIDADE** do produto? (ex: 10 litros)
   • **CUSTOS** (mão de obra, máquina, produto)?
   • **OBSERVAÇÕES ADICIONAIS?** (operador, condições climáticas, etc.)

Deseja informar algum desses dados?"

USER: "Sim, vou usar o Trator John Deere, pulverizador acoplado, 10 litros de Roundup, 
e o Cleiton vai ser o operador"

ISIDORO: "Ótimo! Registrando:
   • Trator: **John Deere** ✅
   • Implemento: **Pulverizador acoplado** ✅  
   • Produto: **Roundup** ✅
   • Quantidade: **10 litros** ✅
   • Observações: **Operador: Cleiton** ✅

Há mais algo? (custos, condições climáticas?)"

USER: "Não, pode registrar assim mesmo"

ISIDORO: "Perfeito!"

6️⃣ — CHAMAR A FERRAMENTA COM TODOS OS DADOS (PASSO 5️⃣ FINAL COMPLETO)
────────────────────────────────────────────────────────────────────
[VOCÊ CHAMA: registrar_operacao_agricola(
  safra="Safra Tomate",
  data_operacao="18/03/2026",
  talhao="Pivot II",
  tipo_operacao="pulv_daninhas",
  trator="John Deere",
  implemento="Pulverizador acoplado",
  produto_insumo="Roundup",
  quantidade_insumo=10,
  quantidade_unidade="litros",
  observacoes="Operador: Cleiton"
)]

7️⃣ — RESPONDER AO USUÁRIO COM CONFIRMAÇÃO FINAL
─────────────────────────────────────────────────
ISIDORO: "✅ Operação agrícola registrada em rascunho!
   🆔 ID de aprovação: 5f4d8c1a-9b2e-4f6c-a3e1-2c5d9e7f1a8b
   📋 Tipo: Controle de Plantas Daninhas (herbicida)
   🌾 Safra: Tomate | Talhão: Pivot II | Data: 18/03/2026
   🚜 Máquinas: John Deere + Pulverizador
   💧 Insumo: 10 litros de Roundup
   👤 Operador: Cleiton
   
⏳ Aguardando revisão humana para efetivar o registro."

═══════════════════════════════════════════════════════════════════════════════

**CHECKLIST DE CAMPOS PARA OPERAÇÃO AGRÍCOLA — PERGUNTE SEMPRE (não omita nenhum):**
  1. **TIPO DE OPERAÇÃO** - apresentar categorias:
     - Preparação do Solo: Limpeza, Aração, Gradagem, Subsolagem, Correção
     - Adubação: Base, Cobertura, Foliar
     - Plantio: Dessecação, Direto, Convencional
     - Tratos Culturais: Irrigação, Poda, Desbaste, Amontoa
     - Pulverização: Herbicida, Fungicida, Inseticida, Pragas, Doenças, Daninhas
     - Mecânicas: Roçada, Cultivo
  2. **TALHÃO/TALHÕES** - qual(is) área(s) vai(vão) sofrer a operação
  3. **DATA DE INÍCIO** - ex: "20/03/2026" ou "20/03/2026 14:00"
  4. **DATA DE FIM** (opcional) - "Se a operação for demorar mais de um dia, qual a data de conclusão?"
  5. **TRATOR/EQUIPAMENTO PRINCIPAL** - "Qual equipamento vai realizar? (ex: Trator, Colhedeira)" 
     - Usar consultar_maquinas para verificar nomes exatos disponíveis
  6. **IMPLEMENTO/REBOQUE** - "Vai usar implemento? (grade, arado, plantadeira, pulverizador, etc.)"
     - Usar consultar_maquinas se necessário
  7. **PRODUTO/INSUMO UTILIZADO** - "Qual produto foi/será utilizado?" (ex: adubo, herbicida, sementes)
     - Pergunte SEMPRE para operações com insumos
  8. **QUANTIDADE DE INSUMO** - "Quantas unidades? (litros, kg, sacas, ton)"
     - Incluir a unidade na resposta
  9. **RESPONSÁVEL/OPERADOR** (nas observações) - "Quem executará/executou a operação?"
  10. **CONDIÇÕES CLIMÁTICAS** (nas observações) - "Como estavam as condições? (chuva, vento, temperatura)"
  11. **OBSERVAÇÕES ADICIONAIS** - problemas, anotações especiais, detalhes relevantes

**IMPORTANTE:**
- Sempre confirme a safra ATIVA com o usuário antes de prosseguir
- Se o usuário disser "planejada para 20/03", use data_inicio=20/03/2026 (a IA interpreta como planejada)
- Responsável e observações climáticas DEVEM ir no campo "observacoes"
- Se usuário não souber a data exata, pergunte "quando foi/será?"
- Se não souberaportador máquina exata, pergunte "qual marca/modelo?" ou "descreva"

Movimentação de Carga (colheita) — SEMPRE: consultar_sessoes_colheita_ativas() PRIMEIRO:
- "Registrar carga / caminhão saindo" → 1) consultar_sessoes_colheita_ativas → se sessão ativa: "Sessão de colheita da Safra [X] em andamento. Qual talhão?" → 2) confirmar talhão → 3) **PERGUNTAR TODOS OS CAMPOS (veja checklist abaixo)** → 4) registrar_movimentacao_carga COM TODOS os dados

**CHECKLIST DE CAMPOS — PERGUNTE SEMPRE (não omita nenhum):**
  1. OBRIGATÓRIOS: peso_bruto, tara
  2. PLACA (ex: OLV-9987) 
  3. MOTORISTA (ex: Cleiton)
  4. **DESCONTOS em kg** (ex: "Houve descontos por umidade? Quantos kg?" — calcular se necessário)
     - Se user der % de umidade → converter em kg: descontos = (peso_bruto * %_umidade) / 100
     - Se user der kg direto → usar valor
     - Se nãohouver → 0
  5. **CONDIÇÕES DOS GRÃOS** (ex: "Quais as condições? Boa, Avariada, Úmida, etc?")
  6. CUSTO DO TRANSPORTE em **REAIS** (não em $/tonelada)
     - Pergunte: "Qual foi o custo total do transporte em R$?" OU "Qual o frete? R$ por tonelada?"
     - Se responder R$/tonelada: usar `custo_transporte_unidade='tonelada'`
     - Se responder R$/saca: usar `custo_transporte_unidade='saca'`
     - Se responder valor fixo em R$: usar `custo_transporte_unidade='unidade'`
  7. CONTRATO/NF PROVISÓRIA (ex: NF-2026-001)
  8. TIPO DE DESTINO (armazenagem_interna, armazenagem_externa, venda_direta)
     - Se armazenagem_interna: pergunte o local
     - Se externa ou venda: pergunte a empresa
  9. OBSERVAÇÕES (se houver algo adicional)

- "Caminhão pesou 28.500 kg bruto tara 13.200 umidade 2%" → 1) calcular descontos por umidade 2) confirmar talhão 3) **perguntar TODOS os campos da checklist** → 4) registrar_movimentacao_carga
- "Quero lançar a pesagem de um caminhão" → 1) consultar_sessoes_colheita_ativas → se NÃO houver: "Não há sessão ativa. Inicie uma sessão de colheita no sistema antes de registrar cargas." → se houver: **PERGUNTAR TODOS OS CAMPOS** em uma conversa natural
- "Saída de carga talhão 5" → 1) consultar_sessoes_colheita_ativas → 2) confirmar safra ativa e talhão → 3) **PERGUNTAR TODOS OS CAMPOS** → 4) registrar_movimentacao_carga

DATA DE HOJE: {data_hoje}
FAZENDA/TENANT: {tenant_nome}
"""


@dataclass
class IsidoroResponse:
    """Resposta estruturada do Isidoro."""
    text: str
    actions_created: list[dict] = field(default_factory=list)
    tool_calls: list[str] = field(default_factory=list)
    error: Optional[str] = None


def _extract_retry_delay(exc: Exception) -> Optional[float]:
    """Extrai o retryDelay (em segundos) de um erro 429 do Google Gemini, ou None."""
    try:
        msg = str(exc)
        import re
        # Formato: 'retryDelay': '40s'  ou  "retryDelay": "40.87s"
        m = re.search(r"retryDelay['\"]?\s*:\s*['\"]([0-9.]+)s", msg)
        if m:
            return float(m.group(1))
        # Formato: 'Please retry in 40.87s'
        m = re.search(r"retry in ([0-9.]+)s", msg, re.IGNORECASE)
        if m:
            return float(m.group(1))
    except Exception:
        pass
    return None


def _friendly_error_message(exc: Exception) -> str:
    """Retorna mensagem amigável ao usuário baseada no tipo de erro."""
    msg = str(exc)
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
        delay = _extract_retry_delay(exc)
        if delay and delay <= 90:
            secs = int(delay) + 5
            return (
                f"⏳ O assistente está temporariamente sobrecarregado. "
                f"Aguarde uns {secs} segundos e envie sua mensagem novamente."
            )
        return (
            "⚠️ Limite de uso da IA atingido por hoje. "
            "Por favor, tente novamente mais tarde ou amanhã."
        )
    if "401" in msg or "403" in msg or "UNAUTHENTICATED" in msg:
        return "🔒 Sessão expirada. Por favor, recarregue a página e faça login novamente."
    if "timeout" in msg.lower() or "timed out" in msg.lower():
        return "⏱️ A IA demorou mais que o esperado. Por favor, tente novamente."
    return "Encontrei um problema técnico. Por favor, tente novamente."


class IsidoroAgent:
    """
    Agente Isidoro — wraps ZeroclawAgent com contexto agrícola e ferramentas Agrolink.

    Thread-safe para uso em Django Channels (múltiplos WebSockets simultâneos).
    O histórico de conversa é mantido por tenant/user na memória (em produção,
    usar Redis via django-channels + RedisChannelLayer).

    _briefing_sent é class-level para persistir entre instâncias (cada
    connect() do consumer cria uma nova instância).

    Args:
        base_url: URL base da API Agrolink (ex: "http://backend:8000/api")
        jwt_token: JWT do Isidoro com permissões de criar Actions
        model: Modelo LLM a usar (default: "glm-5" / GLM ZhipuAI)
        api_key: Chave da API do LLM (fallback: env API_KEY)
        llm_base_url: URL base do LLM (fallback: GLM default)
        max_history: Máximo de mensagens no histórico por sessão
        tenant_id: UUID do tenant para isolamento de dados (IMPORTANTE para multi-tenancy)
    """

    # Class-level: rastreia se o briefing completo já foi enviado hoje
    # Chave = session_key (tenant:user), Valor = date string "YYYY-MM-DD"
    _briefing_sent: dict[str, str] = {}

    def __init__(
        self,
        base_url: str,
        jwt_token: str,
        model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None,
        llm_base_url: Optional[str] = None,
        temperature: float = 0.3,
        max_history: int = 20,
        tenant_id: str = "",
        google_cse_api_key: Optional[str] = None,
        google_cse_cx: Optional[str] = None,
    ):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.model = model
        self.max_history = max_history
        self.tenant_id = tenant_id
        self._cse_api_key = (
            google_cse_api_key
            or _os.environ.get("GOOGLE_CSE_API_KEY", "")
        )
        self._cse_cx = (
            google_cse_cx
            or _os.environ.get("GOOGLE_CSE_CX", "")
        )

        logger.info(
            "IsidoroAgent.__init__: tenant_id=%s base_url=%s",
            tenant_id, base_url
        )

        tools = get_agrolink_tools(base_url=base_url, jwt_token=jwt_token, tenant_id=tenant_id)

        self._agent = ZeroclawAgent(
            tools=tools,
            model=model,
            api_key=api_key or os.environ.get("ISIDORO_API_KEY") or os.environ.get("API_KEY"),
            base_url=llm_base_url or os.environ.get("ISIDORO_LLM_BASE_URL") or os.environ.get("API_BASE"),
            temperature=temperature,
            system_prompt=None,  # Será injetado por sessão
        )

        # Histórico: chave = f"{tenant_id}:{user_id}"
        self._histories: dict[str, list] = {}

    def _session_key(self, tenant_id: str, user_id: str) -> str:
        return f"{tenant_id}:{user_id}"

    def _get_history(self, tenant_id: str, user_id: str) -> list:
        key = self._session_key(tenant_id, user_id)
        return self._histories.setdefault(key, [])

    def _trim_history(self, history: list) -> None:
        """Mantém o histórico dentro do limite, preservando o SystemMessage."""
        while len(history) > self.max_history * 2:
            # Remove par mais antigo (mantém SystemMessage no início)
            if len(history) > 2 and isinstance(history[0], SystemMessage):
                history.pop(1)
            else:
                history.pop(0)

    def clear_history(self, tenant_id: str, user_id: str) -> None:
        """Limpa o histórico de conversa de uma sessão."""
        key = self._session_key(tenant_id, user_id)
        self._histories.pop(key, None)

    def inject_file_context(
        self,
        tenant_id: str,
        user_id: str,
        filename: str,
        content: str,
        tenant_nome: str = "Sua Fazenda",
    ) -> None:
        """
        Injeta o conteúdo de um arquivo no histórico da sessão.

        O arquivo é adicionado como um par HumanMessage/AIMessage artificial
        para que o LLM tenha acesso ao conteúdo em mensagens futuras.
        """
        from datetime import date

        history = self._get_history(tenant_id, user_id)

        # Inicializa SystemMessage se sessão nova
        if not history:
            system_content = ISIDORO_SYSTEM_PROMPT.format(
                data_hoje=date.today().strftime("%d/%m/%Y"),
                tenant_nome=tenant_nome,
            )
            history.append(SystemMessage(content=system_content))

        # Injeta o conteúdo como se o usuário tivesse enviado o arquivo
        file_msg = (
            f"[Arquivo enviado: {filename}]\n\n"
            f"{content}"
        )
        history.append(HumanMessage(content=file_msg))

        # Resposta do agente reconhecendo o arquivo (sintética, não passa pelo LLM)
        ack_msg = (
            f"Recebi o arquivo '{filename}' e já tenho acesso ao conteúdo. "
            "Pode me perguntar qualquer coisa sobre ele ou me dizer o que quer fazer."
        )
        history.append(AIMessage(content=ack_msg))
        self._trim_history(history)

        logger.info("File context injected: tenant=%s user=%s filename=%s chars=%d",
                    tenant_id, user_id, filename, len(content))

    async def chat(
        self,
        user_message: str,
        tenant_id: str,
        user_id: str,
        tenant_nome: str = "Sua Fazenda",
    ) -> IsidoroResponse:
        """
        Processa uma mensagem do usuário e retorna a resposta do Isidoro.

        Args:
            user_message: Texto recebido do usuário (WhatsApp/Web)
            tenant_id: UUID do tenant no Agrolink
            user_id: Identificador do usuário (UUID ou número WhatsApp)
            tenant_nome: Nome da fazenda/empresa para personalizar respostas

        Returns:
            IsidoroResponse com o texto da resposta e metadados
        """
        from datetime import date

        history = self._get_history(tenant_id, user_id)

        # Injeta SystemMessage se sessão nova
        if not history:
            system_content = ISIDORO_SYSTEM_PROMPT.format(
                data_hoje=date.today().strftime("%d/%m/%Y"),
                tenant_nome=tenant_nome,
            )
            history.append(SystemMessage(content=system_content))

        # ── PRÉ-FETCH 1: detecta análise de produtos → busca Google CSE ────────
        web_context_injected = False
        if _is_product_analysis(user_message) and (self._cse_api_key and self._cse_cx):
            search_query = f"{user_message.strip()} produto agrícola defensivo agronomia"
            snippets = await _fetch_web_snippets(
                search_query, self._cse_api_key, self._cse_cx, max_results=6
            )
            if snippets:
                snippets_text = "\n".join(
                    f"[{i+1}] {s['title']}\n    URL: {s['link']}\n    {s['snippet']}"
                    for i, s in enumerate(snippets)
                )
                web_injection = SystemMessage(content=(
                    "═══════════════════════════════════════════════════\n"
                    "INFORMAÇÕES DA WEB — PESQUISA GOOGLE (consultado agora)\n"
                    "═══════════════════════════════════════════════════\n"
                    f"{snippets_text}\n"
                    "═══════════════════════════════════════════════════\n"
                    "INSTRUÇÃO: O usuário está perguntando sobre produtos agrícolas.\n"
                    "Use as fontes acima para embasar sua resposta.\n"
                    "Ao citar uma informação, referencie a fonte com [N] (ex: [1], [2]).\n"
                    "Ao final das citações, inclua a lista: Fontes: [1] URL, [2] URL, etc.\n"
                    "SEMPRE encerre com o aviso: \n"
                    "'⚠️ Recomendação técnica para avaliação. Consulte o agrônomo responsável "
                    "antes de substituir ou alterar qualquer produto prescrito — pode envolver "
                    "receituário agronômico e registro do produto.'\n"
                    "═══════════════════════════════════════════════════"
                ))
                history.append(web_injection)
                web_context_injected = True
                logger.info(
                    "Isidoro web-search injected: tenant=%s user=%s sources=%d",
                    tenant_id, user_id, len(snippets),
                )

        # ── PRÉ-FETCH 2: detecta operação agrícola e busca safras ──────────────
        # NÃO depende do LLM chamar a ferramenta — fazemos a chamada em Python
        # e injetamos o resultado no contexto ANTES de o LLM ver a mensagem.
        safra_context_injected = False
        if _is_agriculture_operation(user_message):
            safras_text = await _fetch_safras_ativas(self.base_url, self.jwt_token, self.tenant_id)
            safra_injection = SystemMessage(content=(
                "═══════════════════════════════════════════════════\n"
                "DADOS DO SISTEMA — SAFRAS ATIVAS (consultado agora)\n"
                "═══════════════════════════════════════════════════\n"
                f"{safras_text}\n"
                "═══════════════════════════════════════════════════\n"
                "INSTRUÇÃO MANDATÓRIA: O usuário está iniciando um registro agrícola.\n"
                "Sua ÚNICA resposta agora é apresentar a lista de safras acima\n"
                "e perguntar qual delas está vinculada à operação.\n"
                "NÃO pergunte talhão, data, insumo, cultura ou qualquer outro campo.\n"
                "NÃO repita a consulta de safras — os dados já estão acima.\n"
                "Aguarde o usuário escolher a safra antes de avançar.\n"
                "═══════════════════════════════════════════════════"
            ))
            history.append(safra_injection)
            safra_context_injected = True
            logger.info(
                "Isidoro safra pre-fetch: tenant=%s user=%s result_len=%d",
                tenant_id, user_id, len(safras_text),
            )

        # ── DETECÇÃO DE CONFIRMAÇÃO ────────────────────────────────────────────
        # Quando o usuário confirma com "sim"/"ok"/etc., injeta instrução mandatória
        # para forçar o LLM a chamar a ferramenta de registro imediatamente.
        _CONFIRM_RE = re.compile(
            r'^(sim|s|ok|yes|é|e|isso|confirmo|confirmado|correto|certo|pode|'
            r'pode\s+criar|cria|vai|faz|tudo\s+certo|registra|perfeito|'
            r'ótimo|otimo|exato|está\s+certo|tá|ta|vamos|vamo|aceito|'
            r'manda|manda\s+ver|fecha|bora|bom|feito|pode\s+ser|tudo\s+ok|'
            r'n[aã]o\s*,?\s*(s[oó]\s+isso|mais\s+nada|precisa)|sem\s+mais|'
            r'(pode\s+)?registrar?\s*(agora)?|s[oó]\s+isso|nada\s+mais)'
            r'\s*[!\.,]?\s*$',
            re.IGNORECASE | re.UNICODE,
        )
        confirmation_injected = False
        prev_ai_in_history = [m for m in history if isinstance(m, AIMessage)]
        if (_CONFIRM_RE.match(user_message.strip())
                and prev_ai_in_history
                and len(prev_ai_in_history[-1].content or "") > 80):
            # Detecta qual ferramenta deve ser chamada baseado no contexto da conversa
            prev_content = prev_ai_in_history[-1].content or ""
            all_content = " ".join((m.content or "") for m in history if hasattr(m, "content"))
            tool_hint = _detect_tool_from_context(all_content)
            tool_instruction = (
                f"Chame a ferramenta '{tool_hint}' AGORA com os dados coletados."
                if tool_hint else
                "Chame a ferramenta de registro AGORA com os dados coletados."
            )
            history.append(SystemMessage(content=(
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "AÇÃO OBRIGATÓRIA — EXECUTE AGORA:\n"
                "O usuário acabou de CONFIRMAR os dados.\n"
                f"{tool_instruction}\n"
                "Use os dados que você coletou na conversa.\n"
                "Para campos opcionais não informados, use valores padrão.\n"
                "NÃO responda com texto. NÃO repita o resumo.\n"
                "NÃO peça mais informações. NÃO peça confirmação adicional.\n"
                "CHAME A FERRAMENTA AGORA.\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )))
            confirmation_injected = True
            logger.info(
                "Isidoro: confirmation detected, forcing tool call (%s). tenant=%s user=%s msg=%r",
                tool_hint or "generic", tenant_id, user_id, user_message,
            )

        history.append(HumanMessage(content=user_message))
        self._trim_history(history)

        # Captura tamanho do histórico antes do invoke para extrair mensagens novas depois
        history_len_before_invoke = len(history)

        # Tenta até 2 vezes: na 1ª tentativa normal; se 429 com retryDelay ≤ 70s, aguarda e tenta mais uma vez.
        last_exc = None
        for attempt in range(2):
            try:
                result = await self._agent.ainvoke({"messages": history})
                break  # sucesso
            except Exception as exc:
                last_exc = exc
                retry_delay = _extract_retry_delay(exc)
                if retry_delay is not None and retry_delay <= 70 and attempt == 0:
                    logger.warning(
                        "Isidoro chat: 429 rate-limit na tentativa 1, aguardando %.0fs antes de retry. tenant=%s",
                        retry_delay, tenant_id,
                    )
                    import asyncio as _asyncio
                    await _asyncio.sleep(retry_delay)
                    continue
                # Não é 429 recuperável ou já é 2ª tentativa
                logger.exception("Erro no chat do Isidoro: %s", exc)
                error_text = _friendly_error_message(exc)
                return IsidoroResponse(text=error_text, error=str(exc))
        else:
            # Esgotou tentativas
            logger.exception("Erro no chat do Isidoro (após retry): %s", last_exc)
            error_text = _friendly_error_message(last_exc)
            return IsidoroResponse(text=error_text, error=str(last_exc))

        messages = result.get("messages", [])

        # Encontra a última AIMessage
        ai_messages = [m for m in messages if isinstance(m, AIMessage)]
        last_ai = ai_messages[-1] if ai_messages else None

        response_text = (
            last_ai.content if last_ai and isinstance(last_ai.content, str)
            else "Desculpe, não foi possível processar sua solicitação."
        )

        # Atualiza histórico com TODAS as mensagens novas deste turno
        # (tool_calls AIMessage, ToolMessages, AIMessage final)
        # Isso garante que turnos futuros vejam o contexto completo das ferramentas.
        result_messages = result.get("messages", [])
        new_messages = result_messages[history_len_before_invoke:]
        for m in new_messages:
            history.append(m)

        # Remove SystemMessages temporárias injetadas neste turno
        # (safra injection + confirmation injection) para não poluir turnos futuros
        _remove_markers = []
        if safra_context_injected:
            _remove_markers.append("DADOS DO SISTEMA — SAFRAS ATIVAS")
        if confirmation_injected:
            _remove_markers.append("AÇÃO OBRIGATÓRIA — EXECUTE AGORA")
        if web_context_injected:
            _remove_markers.append("INFORMAÇÕES DA WEB — PESQUISA GOOGLE")
        if _remove_markers:
            history[:] = [
                m for m in history
                if not (
                    isinstance(m, SystemMessage)
                    and any(marker in (m.content or "") for marker in _remove_markers)
                )
            ]

        # Extrai nomes de tool_calls para logging
        tool_call_names = []
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                tool_call_names.extend(tc.get("name", "") for tc in msg.tool_calls)

        logger.info(
            "Isidoro chat: tenant=%s user=%s tools=%s",
            tenant_id, user_id, tool_call_names,
        )

        return IsidoroResponse(
            text=response_text,
            tool_calls=tool_call_names,
        )

    async def initialize_session(
        self,
        tenant_id: str,
        user_id: str,
        tenant_nome: str = "Sua Fazenda",
        user_nome: str = "",
    ) -> IsidoroResponse:
        """
        Gera o briefing de boas-vindas ao conectar.

        Chama consultar_safras_ativas, consultar_actions_pendentes, consultar_estoque
        e consultar_maquinas via LLM/tools, e retorna uma saudação personalizada
        com o resumo do dia. O trigger interno é descartado do histórico —
        a sessão começa limpa com apenas a saudação do agente.

        Se a sessão já existe (reconexão), retorna uma saudação simples.
        """
        from datetime import date

        history = self._get_history(tenant_id, user_id)
        key = self._session_key(tenant_id, user_id)
        today_str = date.today().isoformat()

        # Briefing já enviado hoje — saudação simples (sem chamar ferramentas)
        if self._briefing_sent.get(key) == today_str:
            saudacao = _saudacao_por_horario()
            nome_display = user_nome.split()[0] if user_nome else ""
            if nome_display:
                return IsidoroResponse(text=f"{saudacao}, {nome_display}! Como posso ajudar?")
            return IsidoroResponse(text=f"{saudacao}! Como posso ajudar?")

        # Reconexão: sessão já tem histórico — saudação simples
        if history:
            saudacao = _saudacao_por_horario()
            nome_display = user_nome.split()[0] if user_nome else ""
            if nome_display:
                return IsidoroResponse(text=f"{saudacao}, {nome_display}! Estou de volta. Como posso ajudar?")
            return IsidoroResponse(text=f"{saudacao}! Estou de volta. Como posso ajudar?")

        # Nova sessão: injeta SystemMessage
        system_content = ISIDORO_SYSTEM_PROMPT.format(
            data_hoje=date.today().strftime("%d/%m/%Y"),
            tenant_nome=tenant_nome,
        )
        history.append(SystemMessage(content=system_content))

        saudacao = _saudacao_por_horario()
        data_fmt = date.today().strftime("%d/%m/%Y")

        # Nome do usuário para personalizar a saudação
        nome_display = user_nome.split()[0] if user_nome else ""
        cumprimento_usuario = f" para {nome_display}" if nome_display else ""

        # Mensagem interna de trigger — NÃO fica no histórico permanente
        trigger = HumanMessage(content=(
            f"[BRIEFING_SESSÃO — resposta automática, não exibir este prompt ao usuário]\n"
            f"Hoje é {data_fmt}. Execute nesta ordem:\n"
            f"1. Chame consultar_safras_ativas() para listar safras em andamento/planejadas\n"
            f"2. Chame consultar_actions_pendentes() para ver ações aguardando aprovação\n"
            f"3. Chame consultar_estoque() para ver os itens em estoque\n"
            f"4. Chame consultar_maquinas() para ver os equipamentos cadastrados\n"
            f"Com base nos dados coletados, gere uma mensagem de {saudacao}{cumprimento_usuario} para a fazenda {tenant_nome}.\n"
            f"A mensagem deve incluir:\n"
            f"  - Saudação: '{saudacao}{', ' + nome_display if nome_display else ''}!' seguida da data de hoje\n"
            f"  - Safras ativas: nome, cultura e status de cada uma\n"
            f"  - Pendências: quantidade e módulos das ações aguardando aprovação\n"
            f"  - Estoque: NÃO liste todos os produtos. Mostre SOMENTE itens com estoque BAIXO (quantidade <= estoque_minimo) ou NEGATIVO.\n"
            f"    Se nenhum item estiver baixo ou crítico, diga 'Estoque: ✅ Todos os itens estão dentro dos níveis normais.'\n"
            f"  - Máquinas: quantidade de equipamentos e se há alguma OS aberta\n"
            f"  - Finalize perguntando em que pode ajudar hoje\n"
            f"Seja conciso, amigável e objetivo. Use bullet points. NÃO peça nada ao usuário."
        ))

        # Invoca o agente com histórico temporário (trigger não é persistido)
        temp_messages = history + [trigger]
        try:
            result = await self._agent.ainvoke({"messages": temp_messages})
            messages = result.get("messages", [])
            ai_messages = [m for m in messages if isinstance(m, AIMessage)]
            last_ai = ai_messages[-1] if ai_messages else None

            greeting_text = (
                last_ai.content
                if last_ai and isinstance(last_ai.content, str)
                else (
                    f"{saudacao}{', ' + nome_display if nome_display else ''}! "
                    f"Sou o Isidoro, seu assistente agrícola da fazenda {tenant_nome}.\n"
                    f"Hoje é {data_fmt}. Como posso ajudar?"
                )
            )

            # Persiste apenas a saudação no histórico (não o trigger)
            if last_ai:
                history.append(last_ai)

            tool_call_names = []
            for msg in messages:
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    tool_call_names.extend(tc.get("name", "") for tc in msg.tool_calls)

            logger.info(
                "Isidoro greeting: tenant=%s user=%s tools=%s",
                tenant_id, user_id, tool_call_names,
            )

            # Marca que o briefing foi enviado hoje — próximas conexões
            # receberão saudação simples sem chamar ferramentas
            self._briefing_sent[key] = today_str

            return IsidoroResponse(text=greeting_text, tool_calls=tool_call_names)

        except Exception as exc:
            logger.exception("Erro ao gerar briefing inicial: %s", exc)
            nome_cumprimento = f", {nome_display}" if nome_display else ""
            fallback = (
                f"{saudacao}{nome_cumprimento}! Sou o Isidoro, seu assistente agrícola da fazenda {tenant_nome}.\n"
                f"Hoje é {data_fmt}. Estou pronto para ajudar com operações agrícolas, "
                f"estoque, máquinas e muito mais. Como posso ajudar hoje?"
            )
            # Se for erro de quota, avisa o usuário; caso contrário usa saudação genérica
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc) or "quota" in str(exc).lower():
                error_note = _friendly_error_message(exc)
                fallback = fallback + f"\n\n_{error_note}_"
            history.append(AIMessage(content=fallback))
            return IsidoroResponse(text=fallback, error=str(exc))

    def chat_sync(
        self,
        user_message: str,
        tenant_id: str,
        user_id: str,
        tenant_nome: str = "Sua Fazenda",
    ) -> IsidoroResponse:
        """Versão síncrona do chat (para uso em scripts/testes)."""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(
                        asyncio.run,
                        self.chat(user_message, tenant_id, user_id, tenant_nome),
                    )
                    return future.result()
            return loop.run_until_complete(
                self.chat(user_message, tenant_id, user_id, tenant_nome)
            )
        except RuntimeError:
            return asyncio.run(
                self.chat(user_message, tenant_id, user_id, tenant_nome)
            )
