"""
Ferramentas ZeroClaw para integração com o Agrolink.

Cada função é um @tool do LangChain que chama a API REST do Agrolink
e cria Actions (draft) na fila de aprovação humana.

Todas as ferramentas retornam JSON string com o resultado da operação.
Nenhuma altera dados diretamente — o fluxo sempre passa pelo Action Queue.

Uso:
    from zeroclaw_tools.tools.agrolink_tools import get_agrolink_tools

    tools = get_agrolink_tools(
        base_url="http://localhost:8000/api",
        jwt_token="Bearer <token>",
    )
    agent = ZeroclawAgent(tools=tools, ...)
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import httpx
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# ── Client singleton por chamada ─────────────────────────────────────────────

def _client(base_url: str, jwt_token: str) -> httpx.Client:
    """Cria um client HTTP autenticado para a API Agrolink."""
    return httpx.Client(
        base_url=base_url.rstrip("/"),
        headers={
            "Authorization": jwt_token
            if jwt_token.startswith("Bearer ")
            else f"Bearer {jwt_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        timeout=30.0,
    )


def _post_action(
    base_url: str,
    jwt_token: str,
    module: str,
    action_type: str,
    draft_data: dict,
    meta: dict | None = None,
) -> str:
    """Cria um draft de Action na fila de aprovação do Agrolink."""
    payload = {
        "module": module,
        "action_type": action_type,
        "draft_data": draft_data,
        "validation": {},
        "meta": meta or {"origem": "isidoro", "canal": "whatsapp"},
    }
    try:
        with _client(base_url, jwt_token) as c:
            resp = c.post("/actions/", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return json.dumps({
                "sucesso": True,
                "action_id": data.get("id"),
                "status": data.get("status"),
                "mensagem": "Ação criada e aguardando aprovação humana.",
            })
    except httpx.HTTPStatusError as exc:
        return json.dumps({"sucesso": False, "erro": exc.response.text})
    except Exception as exc:
        return json.dumps({"sucesso": False, "erro": str(exc)})


def _get(base_url: str, jwt_token: str, path: str, params: dict | None = None) -> str:
    """Realiza GET na API Agrolink."""
    try:
        with _client(base_url, jwt_token) as c:
            resp = c.get(path, params=params or {})
            resp.raise_for_status()
            return resp.text
    except httpx.HTTPStatusError as exc:
        return json.dumps({"erro": exc.response.text})
    except Exception as exc:
        return json.dumps({"erro": str(exc)})


# ── Factory de tools com closures ─────────────────────────────────────────────

def get_agrolink_tools(base_url: str, jwt_token: str) -> list:
    """
    Retorna lista de LangChain tools configuradas com base_url e jwt.

    Args:
        base_url: URL base da API Agrolink (ex: "http://backend:8000/api")
        jwt_token: Token JWT do Isidoro (ex: "Bearer eyJ...")

    Returns:
        Lista de BaseTool prontos para uso no ZeroclawAgent
    """

    @tool
    def registrar_operacao_agricola(
        talhao: str,
        cultura: str,
        data_operacao: str,
        atividade: str,
        insumo: str = "",
        quantidade: float = 0.0,
        unidade: str = "L",
        custo_unitario: float = 0.0,
        area_ha: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Registra uma operação agrícola (pulverização, plantio, adubação, etc.).
        Cria um draft na fila de aprovação — nenhum dado é gravado diretamente.

        Args:
            talhao: Nome ou código do talhão
            cultura: Nome da cultura (ex: Soja, Milho, Cana)
            data_operacao: Data no formato DD/MM/AAAA ou AAAA-MM-DD
            atividade: Tipo de operação (ex: Pulverização, Adubação, Plantio)
            insumo: Nome do insumo/defensivo utilizado
            quantidade: Quantidade do insumo
            unidade: Unidade de medida (L, kg, t, sc)
            custo_unitario: Custo por unidade em reais
            area_ha: Área tratada em hectares
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token,
            module="agricultura",
            action_type="operacao_agricola",
            draft_data={
                "talhao": talhao,
                "cultura": cultura,
                "data_operacao": data_operacao,
                "atividade": atividade,
                "insumo": insumo,
                "quantidade": quantidade,
                "unidade": unidade,
                "custo_unitario": custo_unitario,
                "area_ha": area_ha,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_colheita(
        talhao: str,
        cultura: str,
        data_colheita: str,
        producao_total: float,
        unidade: str = "sc",
        area_ha: float = 0.0,
        umidade_perc: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Registra colheita de um talhão.

        Args:
            talhao: Nome ou código do talhão
            cultura: Cultura colhida
            data_colheita: Data no formato DD/MM/AAAA
            producao_total: Total colhido (sacas, toneladas, etc.)
            unidade: Unidade (sc, t, kg)
            area_ha: Área colhida em hectares
            umidade_perc: Umidade dos grãos em %
            observacoes: Observações
        """
        return _post_action(
            base_url, jwt_token,
            module="agricultura",
            action_type="colheita",
            draft_data={
                "talhao": talhao,
                "cultura": cultura,
                "data_colheita": data_colheita,
                "producao_total": producao_total,
                "unidade": unidade,
                "area_ha": area_ha,
                "umidade_perc": umidade_perc,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_manutencao_maquina(
        maquina_nome: str,
        tipo_registro: str,
        data: str,
        descricao: str,
        custo: float = 0.0,
        tecnico: str = "",
        horas_trabalhadas: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Registra manutenção, revisão ou reparo em uma máquina/implemento agrícola.

        Args:
            maquina_nome: Nome da máquina (ex: Trator John Deere 7200J)
            tipo_registro: Tipo (ex: manutencao, revisao, abastecimento, parada)
            data: Data no formato DD/MM/AAAA
            descricao: Descrição do serviço realizado
            custo: Custo em reais
            tecnico: Nome do técnico/mecânico
            horas_trabalhadas: Horas do horímetro
            observacoes: Observações adicionais
        """
        action_type_map = {
            "manutencao": "manutencao_maquina",
            "revisao": "manutencao_maquina",
            "reparo": "manutencao_maquina",
            "abastecimento": "abastecimento",
            "parada": "parada_maquina",
        }
        action_type = action_type_map.get(tipo_registro.lower(), "manutencao_maquina")
        return _post_action(
            base_url, jwt_token,
            module="maquinas",
            action_type=action_type,
            draft_data={
                "maquina_nome": maquina_nome,
                "tipo_registro": tipo_registro,
                "data": data,
                "descricao": descricao,
                "custo": custo,
                "tecnico": tecnico,
                "horas_trabalhadas": horas_trabalhadas,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_entrada_estoque(
        nome_produto: str,
        quantidade: float,
        unidade: str,
        data: str,
        fornecedor: str = "",
        codigo_produto: str = "",
        valor_unitario: float = 0.0,
        numero_nf: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra entrada de produto no estoque (compra, recebimento, devolução).

        Args:
            nome_produto: Nome do produto
            quantidade: Quantidade recebida
            unidade: Unidade (kg, L, sc, un, cx)
            data: Data de recebimento (DD/MM/AAAA)
            fornecedor: Nome do fornecedor
            codigo_produto: Código interno do produto
            valor_unitario: Custo unitário em reais
            numero_nf: Número da nota fiscal
            observacoes: Observações
        """
        return _post_action(
            base_url, jwt_token,
            module="estoque",
            action_type="entrada_estoque",
            draft_data={
                "codigo_produto": codigo_produto,
                "nome_produto": nome_produto,
                "quantidade": quantidade,
                "unidade": unidade,
                "data": data,
                "fornecedor": fornecedor,
                "valor_unitario": valor_unitario,
                "numero_nf": numero_nf,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_saida_estoque(
        nome_produto: str,
        quantidade: float,
        unidade: str,
        data: str,
        destino: str = "",
        codigo_produto: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra saída de produto do estoque (uso em campo, venda, descarte).

        Args:
            nome_produto: Nome do produto
            quantidade: Quantidade saindo
            unidade: Unidade (kg, L, sc, un)
            data: Data da saída (DD/MM/AAAA)
            destino: Destino (ex: Talhão A3, Usina, Descarte)
            codigo_produto: Código interno do produto
            observacoes: Observações
        """
        return _post_action(
            base_url, jwt_token,
            module="estoque",
            action_type="saida_estoque",
            draft_data={
                "codigo_produto": codigo_produto,
                "nome_produto": nome_produto,
                "quantidade": quantidade,
                "unidade": unidade,
                "data": data,
                "destino": destino,
                "observacoes": observacoes,
            },
        )

    @tool
    def criar_talhao(
        nome: str,
        area_ha: float,
        fazenda: str = "",
        cultura_atual: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Cria um novo talhão na fazenda.

        Args:
            nome: Nome ou código do talhão (ex: Talhão A1, Gleba Norte)
            area_ha: Área em hectares
            fazenda: Nome da fazenda (deixar vazio se única)
            cultura_atual: Cultura plantada atualmente
            observacoes: Observações
        """
        return _post_action(
            base_url, jwt_token,
            module="fazendas",
            action_type="criar_talhao",
            draft_data={
                "nome": nome,
                "area_ha": area_ha,
                "fazenda": fazenda,
                "cultura_atual": cultura_atual,
                "observacoes": observacoes,
            },
        )

    @tool
    def consultar_actions_pendentes(module: str = "") -> str:
        """
        Consulta actions pendentes de aprovação no sistema Agrolink.

        Args:
            module: Filtrar por módulo (agricultura, maquinas, estoque, fazendas).
                    Deixar vazio para ver todos.
        """
        params = {"status": "pending_approval"}
        if module:
            params["module"] = module
        return _get(base_url, jwt_token, "/actions/", params)

    @tool
    def consultar_estoque(produto: str = "") -> str:
        """
        Consulta o estoque atual de produtos.

        Args:
            produto: Nome parcial do produto para filtrar. Deixar vazio para listar tudo.
        """
        params = {}
        if produto:
            params["search"] = produto
        return _get(base_url, jwt_token, "/estoque/produtos/", params)

    @tool
    def consultar_talhoes(fazenda: str = "") -> str:
        """
        Lista os talhões cadastrados no sistema.

        Args:
            fazenda: Filtrar por nome da fazenda. Deixar vazio para listar todos.
        """
        params = {}
        if fazenda:
            params["search"] = fazenda
        return _get(base_url, jwt_token, "/talhoes/", params)

    @tool
    def consultar_maquinas(search: str = "") -> str:
        """
        Lista as máquinas e implementos cadastrados.

        Args:
            search: Texto de busca para filtrar máquinas por nome ou modelo.
        """
        params = {}
        if search:
            params["search"] = search
        return _get(base_url, jwt_token, "/maquinas/maquinas/", params)

    return [
        registrar_operacao_agricola,
        registrar_colheita,
        registrar_manutencao_maquina,
        registrar_entrada_estoque,
        registrar_saida_estoque,
        criar_talhao,
        consultar_actions_pendentes,
        consultar_estoque,
        consultar_talhoes,
        consultar_maquinas,
    ]
