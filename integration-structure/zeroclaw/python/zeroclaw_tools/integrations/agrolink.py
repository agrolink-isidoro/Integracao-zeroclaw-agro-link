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
from typing import Optional

import httpx
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ..agent import ZeroclawAgent
from ..tools.agrolink_tools import get_agrolink_tools

logger = logging.getLogger(__name__)

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


async def _fetch_safras_ativas(base_url: str, jwt_token: str) -> str:
    """
    Busca diretamente as safras ativas via HTTP (sem passar pelo LLM).
    Retorna string formatada para injetar no contexto.
    """
    auth = jwt_token if jwt_token.startswith("Bearer ") else f"Bearer {jwt_token}"
    try:
        async with httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": auth},
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

REGRAS FUNDAMENTAIS:
1. Você NUNCA grava dados diretamente. Toda ação cria um "draft" para aprovação humana.
2. COLETE TODOS OS CAMPOS do formulário antes de chamar qualquer ferramenta.
   - Antes de chamar a ferramenta, pergunte TODOS os campos, obrigatórios E opcionais.
   - Para cada campo opcional, ofereça o valor padrão e pergunte se o usuário confirma
     ou quer alterar. Exemplo: "Unidade: 'sc' (sacas). Confirma ou quer alterar?"
   - NÃO chame a ferramenta com campos vazios/padrão sem antes confirmar com o usuário.
   - ⚠️ AÇÃO OBRIGATÓRIA: Quando o usuário confirmar os dados com "sim", "confirmado",
     "correto", "pode criar", "ok", "vai", "tudo certo", "cria", "registra" ou qualquer
     expressão de confirmação — chame a ferramenta IMEDIATAMENTE. Não repita o resumo,
     não faça mais perguntas, não peça confirmação adicional. CHAME A FERRAMENTA AGORA.
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
5. Se o usuário enviar um arquivo (Excel, PDF, KML, CSV), oriente que será processado automaticamente.
6. Responda sempre em Português brasileiro, de forma amigável e objetiva.
7. Ao consultar dados, apresente de forma resumida e clara.
8. Se não entender o pedido, peça esclarecimento gentilmente.

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
  registrar_operacao_agricola → safra(ativa)*, talhao*, data_operacao*, atividade*, insumo,
                          quantidade, unidade, custo_unitario, area_ha, observacoes
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
  criar_equipamento     → nome*, categoria*, ano_fabricacao*, valor_aquisicao*, marca, modelo,
                          numero_serie, potencia_cv, capacidade_litros, horimetro_atual,
                          data_aquisicao, status, local_instalacao, observacoes
  registrar_ordem_servico_maquina → equipamento*, descricao_problema*, tipo, prioridade, status,
                          data_previsao, custo_mao_obra, responsavel, prestador_servico, observacoes
  registrar_manutencao_maquina → maquina_nome*, tipo_registro*, data*, descricao*, custo,
                          tecnico, horas_trabalhadas, km_rodados, prestador_servico, prioridade, observacoes
    ↳ tipo_registro valores: abastecimento | manutencao | revisao | reparo | troca_oleo | parada
    ↳ Para ABASTECIMENTO: descricao = combustível + litros (ex: "305 litros Diesel S500"),
      custo = valor total R$, horas_trabalhadas = leitura do horímetro (horas do motor)

(* = obrigatório)

EXEMPLOS DE INTERPRETAÇÃO (siga EXATAMENTE estes fluxos):

Operações agrícolas — SEMPRE: consultar_safras_ativas() PRIMEIRO:
- "Pulverizei o talhão 3 com Roundup" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_operacao_agricola
- "Quero registrar a colheita do talhão Andressa" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_colheita
- "Registrar manejo de dessecação" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_manejo
- "Preciso lançar uma operação de correção de solo" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_operacao_agricola (atividade=Correção de solo)
- "Fiz calagem no talhão B2 ontem" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_operacao_agricola (atividade=Calagem)
- "Preciso registrar uma adubação de cobertura" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_operacao_agricola (atividade=Adubação de cobertura)
- "Fizemos o preparo de solo no talhão 4" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_manejo (tipo=preparo_solo)
- "Plantar soja na área Leste" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_operacao_agricola (atividade=Plantio)
- "OS para irrigação do talhão C1" → 1) consultar_safras_ativas → 2) confirmar safra → 3) perguntar campos de registrar_ordem_servico_agricola

Máquinas / Estoque / Dados (sem safra):
- "Trator D6 fez revisão ontem custou R$1500" → perguntar todos os campos de registrar_manutencao_maquina (tipo_registro=revisao)
- "CR5.85 305lts de diesel horas 2196" → 1) consultar_maquinas("CR5.85") para verificar nome completo → 2) perguntar: data, custo total (ou preço/litro), tecnico=vazio(confirma?), km_rodados=vazio(confirma?), prestador=vazio(confirma?), prioridade=media(confirma?), observacoes → 3) ao confirmar: chamar registrar_manutencao_maquina(tipo_registro="abastecimento", maquina_nome=nome completo encontrado, ...)
- "Abasteci o trator com 150 litros de diesel" → 1) consultar_maquinas para verificar nome → 2) perguntar campos → 3) chamar registrar_manutencao_maquina(tipo_registro="abastecimento")
- "Recebi 500kg de adubo NPK da Fertipar hoje" → perguntar todos os campos de registrar_entrada_estoque
- "Quanto de Roundup temos no estoque?" → consultar_estoque
- "Quais ações estão pendentes de aprovação?" → consultar_actions_pendentes
- "Quais safras estão ativas?" → consultar_safras_ativas

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

    Args:
        base_url: URL base da API Agrolink (ex: "http://backend:8000/api")
        jwt_token: JWT do Isidoro com permissões de criar Actions
        model: Modelo LLM a usar (default: "glm-5" / GLM ZhipuAI)
        api_key: Chave da API do LLM (fallback: env API_KEY)
        llm_base_url: URL base do LLM (fallback: GLM default)
        max_history: Máximo de mensagens no histórico por sessão
    """

    def __init__(
        self,
        base_url: str,
        jwt_token: str,
        model: str = "gemini-2.5-flash",
        api_key: Optional[str] = None,
        llm_base_url: Optional[str] = None,
        temperature: float = 0.3,
        max_history: int = 20,
    ):
        self.base_url = base_url
        self.jwt_token = jwt_token
        self.model = model
        self.max_history = max_history

        tools = get_agrolink_tools(base_url=base_url, jwt_token=jwt_token)

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

        # ── PRÉ-FETCH OBRIGATÓRIO: detecta operação agrícola e busca safras ──
        # NÃO depende do LLM chamar a ferramenta — fazemos a chamada em Python
        # e injetamos o resultado no contexto ANTES de o LLM ver a mensagem.
        safra_context_injected = False
        if _is_agriculture_operation(user_message):
            safras_text = await _fetch_safras_ativas(self.base_url, self.jwt_token)
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
            r'manda|manda\s+ver|fecha|bora|bom|feito|pode\s+ser|tudo\s+ok)'
            r'\s*[!\.,]?\s*$',
            re.IGNORECASE | re.UNICODE,
        )
        confirmation_injected = False
        prev_ai_in_history = [m for m in history if isinstance(m, AIMessage)]
        if (_CONFIRM_RE.match(user_message.strip())
                and prev_ai_in_history
                and len(prev_ai_in_history[-1].content or "") > 80):
            history.append(SystemMessage(content=(
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "AÇÃO OBRIGATÓRIA — EXECUTE AGORA:\n"
                "O usuário acabou de CONFIRMAR os dados resumidos acima.\n"
                "Você DEVE chamar a ferramenta de registro imediatamente.\n"
                "Use os dados que você mesmo listou na mensagem anterior.\n"
                "NÃO responda com texto. NÃO repita o resumo.\n"
                "NÃO peça mais confirmações. CHAME A FERRAMENTA AGORA.\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )))
            confirmation_injected = True
            logger.info(
                "Isidoro: confirmation detected, forcing tool call. tenant=%s user=%s msg=%r",
                tenant_id, user_id, user_message,
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
    ) -> IsidoroResponse:
        """
        Gera o briefing de boas-vindas ao conectar.

        Chama consultar_safras_ativas, consultar_actions_pendentes, consultar_estoque
        e consultar_maquinas via LLM/tools, e retorna uma saudação personalizada
        com o resumo do dia. O trigger interno é descartado do histórico —
        a sessão começa limpa com apenas a saudação do agente.

        Se a sessão já existe (reconexão), retorna uma saudação simples.
        """
        from datetime import date, datetime

        history = self._get_history(tenant_id, user_id)

        # Reconexão: sessão já tem histórico — saudação simples
        if history:
            hora = datetime.now().hour
            saudacao = "Bom dia" if hora < 12 else "Boa tarde" if hora < 18 else "Boa noite"
            return IsidoroResponse(text=f"{saudacao}! Estou de volta. Como posso ajudar?")

        # Nova sessão: injeta SystemMessage
        system_content = ISIDORO_SYSTEM_PROMPT.format(
            data_hoje=date.today().strftime("%d/%m/%Y"),
            tenant_nome=tenant_nome,
        )
        history.append(SystemMessage(content=system_content))

        hora = datetime.now().hour
        saudacao = "Bom dia" if hora < 12 else "Boa tarde" if hora < 18 else "Boa noite"
        data_fmt = date.today().strftime("%d/%m/%Y")

        # Mensagem interna de trigger — NÃO fica no histórico permanente
        trigger = HumanMessage(content=(
            f"[BRIEFING_SESSÃO — resposta automática, não exibir este prompt ao usuário]\n"
            f"Hoje é {data_fmt}. Execute nesta ordem:\n"
            f"1. Chame consultar_safras_ativas() para listar safras em andamento/planejadas\n"
            f"2. Chame consultar_actions_pendentes() para ver ações aguardando aprovação\n"
            f"3. Chame consultar_estoque() para uma visão geral do estoque\n"
            f"4. Chame consultar_maquinas() para ver os equipamentos cadastrados\n"
            f"Com base nos dados coletados, gere uma mensagem de {saudacao} para a fazenda {tenant_nome}.\n"
            f"A mensagem deve incluir:\n"
            f"  - Saudação com a data de hoje\n"
            f"  - Safras ativas: nome, cultura e status de cada uma\n"
            f"  - Pendências: quantidade e módulos das ações aguardando aprovação\n"
            f"  - Estoque: destaques (itens com estoque baixo ou recentes)\n"
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
                    f"{saudacao}! Sou o Isidoro, seu assistente agrícola da fazenda {tenant_nome}.\n"
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
            return IsidoroResponse(text=greeting_text, tool_calls=tool_call_names)

        except Exception as exc:
            logger.exception("Erro ao gerar briefing inicial: %s", exc)
            fallback = (
                f"{saudacao}! Sou o Isidoro, seu assistente agrícola da fazenda {tenant_nome}.\n"
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
