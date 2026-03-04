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
from dataclasses import dataclass, field
from typing import Optional

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ..agent import ZeroclawAgent
from ..tools.agrolink_tools import get_agrolink_tools

logger = logging.getLogger(__name__)

ISIDORO_SYSTEM_PROMPT = """Você é o Isidoro, assistente agrícola inteligente do sistema Agrolink.

Você ajuda produtores rurais a registrar operações do cotidiano da fazenda:
- Operações agrícolas (pulverização, plantio, adubação, colheita)
- Manutenção e abastecimento de máquinas e implementos
- Entrada e saída de insumos no estoque
- Criação e atualização de talhões

REGRAS FUNDAMENTAIS:
1. Você NUNCA grava dados diretamente. Toda ação cria um "draft" para aprovação humana.
2. Sempre confirme os dados antes de criar um draft. Se faltar informação essencial, pergunte.
3. Dopo de criar um draft, informe o número de identificação e que aguarda aprovação.
4. Se o usuário enviar um arquivo (Excel, PDF, KML), oriente que ele será processado automaticamente.
5. Responda sempre em Português brasileiro, de forma amigável e objetiva.
6. Ao consultar dados, apresente de forma resumida e clara.
7. Se não entender o pedido, peça esclarecimento gentilmente.

EXEMPLOS DE INTERPRETAÇÃO:
- "Pulverizei o talhão 3 com Roundup hoje" → registrar_operacao_agricola
- "Trator D6 fez revisão ontem, custou R$1500" → registrar_manutencao_maquina  
- "Recebi 500kg de adubo NPK da Fertipar hoje" → registrar_entrada_estoque
- "Quanto de Roundup temos no estoque?" → consultar_estoque
- "Quais ações estão pendentes de aprovação?" → consultar_actions_pendentes

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

        history.append(HumanMessage(content=user_message))
        self._trim_history(history)

        try:
            result = await self._agent.ainvoke({"messages": history})
            messages = result.get("messages", [])

            # Encontra a última AIMessage
            ai_messages = [m for m in messages if isinstance(m, AIMessage)]
            last_ai = ai_messages[-1] if ai_messages else None

            response_text = (
                last_ai.content if last_ai and isinstance(last_ai.content, str)
                else "Desculpe, não foi possível processar sua solicitação."
            )

            # Atualiza histórico com a resposta
            if last_ai:
                history.append(last_ai)

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

        except Exception as exc:
            logger.exception("Erro no chat do Isidoro: %s", exc)
            return IsidoroResponse(
                text="Encontrei um problema técnico. Por favor, tente novamente.",
                error=str(exc),
            )

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
