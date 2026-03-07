"""
Executors de Actions — converte um Action aprovado em registros reais no banco.

Cada executor recebe o objeto Action, lê draft_data, cria o(s) modelo(s) correspondente(s)
e chama action.mark_executed() ou action.mark_failed().
"""
from __future__ import annotations

import logging
from typing import Optional
import json
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def _notify_user_action_failed(action, error_message: str) -> None:
    """
    Notifica o usuário via WebSocket que a ação falhou.
    Envia uma mensagem ao chat informando sobre o erro.
    """
    try:
        from channels.layers import get_channel_layer
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        user = action.aprovado_por or action.criado_por
        if not user:
            logger.warning("Action %s não tem usuário para notificar", action.id)
            return
        
        tenant_id = str(action.tenant.id) if action.tenant else "global"
        user_id = str(user.id)
        group_name = f"chat_{tenant_id}_{user_id}"
        
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.debug("Channel layer não disponível para notificar usuário")
            return
        
        # Prepara mensagem de erro formatada
        action_type_display = dict(action._meta.get_field('action_type').choices).get(
            action.action_type, action.action_type
        )
        
        error_msg = (
            f"❌ **Erro ao executar ação**: {action_type_display}\n\n"
            f"**Detalhes do erro:**\n{error_message}"
        )
        
        message_event = {
            "type": "chat_message",
            "data": {
                "type": "error",
                "message": error_msg,
                "action_id": str(action.id),
                "timestamp": action.executado_em.isoformat() if action.executado_em else None,
            }
        }
        
        async_to_sync(channel_layer.group_send)(group_name, message_event)
        logger.info("Notificação de erro enviada ao usuário %s da ação %s", user_id, action.id)
        
    except Exception as exc:
        logger.exception("Erro ao notificar usuário sobre falha de ação: %s", exc)


def execute_action(action) -> None:
    """
    Despacha a execução de um Action aprovado para o executor correto.
    Chama action.mark_executed() ou action.mark_failed() ao final.
    Se falhar, notifica o usuário via WebSocket.
    """
    action_type = action.action_type

    executor_map = {
        # ── Fazendas ──────────────────────────────────────────
        "criar_proprietario":      _exec_fazendas_criar_proprietario,
        "criar_fazenda":           _exec_fazendas_criar_fazenda,
        "criar_area":              _exec_fazendas_criar_area,
        "criar_talhao":            _exec_fazendas_criar_talhao,
        "atualizar_talhao":        _exec_fazendas_atualizar_talhao,
        "registrar_arrendamento":  _exec_fazendas_registrar_arrendamento,
        # ── Agricultura ───────────────────────────────────────
        "criar_safra":             _exec_agricultura_criar_safra,
        "colheita":                _exec_agricultura_colheita,
        "movimentacao_carga":      _exec_agricultura_movimentacao_carga,
        "operacao_agricola":       _exec_agricultura_operacao_agricola,
        "registrar_manejo":        _exec_agricultura_registrar_manejo,
        "ordem_servico_agricola":  _exec_agricultura_ordem_servico_agricola,
        # ── Estoque ───────────────────────────────────────────
        "criar_produto":           _exec_estoque_criar_produto,
        "criar_item_estoque":      _exec_estoque_criar_item_estoque,
        "entrada_estoque":         _exec_estoque_entrada,
        "saida_estoque":           _exec_estoque_saida,
        "ajuste_estoque":          _exec_estoque_ajuste,
        "movimentacao_interna":    _exec_estoque_movimentacao_interna,
        # ── Máquinas ──────────────────────────────────────────
        "criar_equipamento":       _exec_maquinas_criar_equipamento,
        "abastecimento":           _exec_maquinas_abastecimento,
        "manutencao_maquina":      _exec_maquinas_ordem_servico,
        "ordem_servico_maquina":   _exec_maquinas_ordem_servico,
        "parada_maquina":          _exec_maquinas_parada,
    }

    fn = executor_map.get(action_type)
    if fn is None:
        error_msg = f"Executor não implementado para action_type='{action_type}'."
        logger.warning("execute_action: action=%s erro=%s", action.id, error_msg)
        action.mark_failed(error_msg)
        _notify_user_action_failed(action, error_msg)
        return

    try:
        fn(action)
    except ValueError as exc:
        # ValueError são erros de validação / recursos não encontrados
        error_msg = str(exc)
        logger.warning("execute_action validation error: action=%s tipo=%s erro=%s", action.id, action_type, error_msg)
        action.mark_failed(error_msg)
        _notify_user_action_failed(action, error_msg)
    except Exception as exc:
        # Outros erros inesperados
        error_msg = f"{exc.__class__.__name__}: {str(exc)}"
        logger.exception("execute_action falhou: action=%s tipo=%s", action.id, action_type)
        action.mark_failed(error_msg)
        _notify_user_action_failed(action, error_msg)


# ─── FAZENDAS ─────────────────────────────────────────────────────────────────

def _exec_fazendas_criar_proprietario(action) -> None:
    from .fazendas import execute_criar_proprietario
    execute_criar_proprietario(action)


def _exec_fazendas_criar_fazenda(action) -> None:
    from .fazendas import execute_criar_fazenda
    execute_criar_fazenda(action)


def _exec_fazendas_criar_area(action) -> None:
    from .fazendas import execute_criar_area
    execute_criar_area(action)


def _exec_fazendas_criar_talhao(action) -> None:
    from .fazendas import execute_criar_talhao
    execute_criar_talhao(action)


def _exec_fazendas_atualizar_talhao(action) -> None:
    from .fazendas import execute_atualizar_talhao
    execute_atualizar_talhao(action)


def _exec_fazendas_registrar_arrendamento(action) -> None:
    from .fazendas import execute_registrar_arrendamento
    execute_registrar_arrendamento(action)


# ─── AGRICULTURA ──────────────────────────────────────────────────────────────

def _exec_agricultura_criar_safra(action) -> None:
    from .agricultura import execute_criar_safra
    execute_criar_safra(action)


def _exec_agricultura_colheita(action) -> None:
    from .agricultura import execute_colheita
    execute_colheita(action)


def _exec_agricultura_movimentacao_carga(action) -> None:
    from .agricultura import execute_movimentacao_carga
    execute_movimentacao_carga(action)


def _exec_agricultura_operacao_agricola(action) -> None:
    from .agricultura import execute_operacao_agricola
    execute_operacao_agricola(action)


def _exec_agricultura_registrar_manejo(action) -> None:
    from .agricultura import execute_registrar_manejo
    execute_registrar_manejo(action)


def _exec_agricultura_ordem_servico_agricola(action) -> None:
    from .agricultura import execute_ordem_servico_agricola
    execute_ordem_servico_agricola(action)


# ─── ESTOQUE ─────────────────────────────────────────────────────────────────

def _exec_estoque_criar_produto(action) -> None:
    from .estoque import execute_criar_produto
    execute_criar_produto(action)


def _exec_estoque_criar_item_estoque(action) -> None:
    from .estoque import execute_criar_item_estoque
    execute_criar_item_estoque(action)


def _exec_estoque_entrada(action) -> None:
    from .estoque import execute_entrada_estoque
    execute_entrada_estoque(action)


def _exec_estoque_saida(action) -> None:
    from .estoque import execute_saida_estoque
    execute_saida_estoque(action)


def _exec_estoque_ajuste(action) -> None:
    from .estoque import execute_ajuste_estoque
    execute_ajuste_estoque(action)


def _exec_estoque_movimentacao_interna(action) -> None:
    from .estoque import execute_movimentacao_interna
    execute_movimentacao_interna(action)


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
