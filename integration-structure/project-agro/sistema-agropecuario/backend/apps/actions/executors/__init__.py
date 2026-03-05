"""
Executors de Actions — converte um Action aprovado em registros reais no banco.

Cada executor recebe o objeto Action, lê draft_data, cria o(s) modelo(s) correspondente(s)
e chama action.mark_executed() ou action.mark_failed().
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def execute_action(action) -> None:
    """
    Despacha a execução de um Action aprovado para o executor correto.
    Chama action.mark_executed() ou action.mark_failed() ao final.
    """
    action_type = action.action_type

    executor_map = {
        # Máquinas
        "abastecimento":         _exec_maquinas_abastecimento,
        "manutencao_maquina":    _exec_maquinas_ordem_servico,
        "ordem_servico_maquina": _exec_maquinas_ordem_servico,
        "criar_equipamento":     _exec_maquinas_criar_equipamento,
        "parada_maquina":        _exec_maquinas_parada,
        # Estoque
        "entrada_estoque":       _exec_estoque_entrada,
        "saida_estoque":         _exec_estoque_saida,
        # Agricultura
        "colheita":              _exec_agricultura_colheita,
        "movimentacao_carga":    _exec_agricultura_movimentacao_carga,
    }

    fn = executor_map.get(action_type)
    if fn is None:
        logger.warning("execute_action: tipo '%s' sem executor implementado. action=%s", action_type, action.id)
        action.mark_failed(f"Executor não implementado para action_type='{action_type}'.")
        return

    try:
        fn(action)
    except Exception as exc:
        logger.exception("execute_action falhou: action=%s tipo=%s erro=%s", action.id, action_type, exc)
        action.mark_failed(str(exc))


# ─── MÁQUINAS ────────────────────────────────────────────────────────────────

def _exec_maquinas_abastecimento(action) -> None:
    from .maquinas import execute_abastecimento
    execute_abastecimento(action)


def _exec_maquinas_ordem_servico(action) -> None:
    from .maquinas import execute_ordem_servico
    execute_ordem_servico(action)


def _exec_maquinas_criar_equipamento(action) -> None:
    from .maquinas import execute_criar_equipamento
    execute_criar_equipamento(action)


def _exec_maquinas_parada(action) -> None:
    from .maquinas import execute_parada_maquina
    execute_parada_maquina(action)


# ─── ESTOQUE ─────────────────────────────────────────────────────────────────

def _exec_estoque_entrada(action) -> None:
    from .estoque import execute_entrada_estoque
    execute_entrada_estoque(action)


def _exec_estoque_saida(action) -> None:
    from .estoque import execute_saida_estoque
    execute_saida_estoque(action)


# ─── AGRICULTURA ──────────────────────────────────────────────────────────────

def _exec_agricultura_colheita(action) -> None:
    from .agricultura import execute_colheita
    execute_colheita(action)


def _exec_agricultura_movimentacao_carga(action) -> None:
    from .agricultura import execute_movimentacao_carga
    execute_movimentacao_carga(action)
