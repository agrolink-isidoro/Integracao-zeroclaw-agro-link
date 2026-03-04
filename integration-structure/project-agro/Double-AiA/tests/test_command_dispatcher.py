import pytest
from scripts.command_dispatcher import parse_command, render_command_value


def test_parse_command_no_command():
    assert parse_command('Hello world') == (None, [])


def test_parse_command_plan():
    c, args = parse_command('/plan nova feature')
    assert c == '/plan'
    assert args == ['nova', 'feature']


def test_render_plan():
    assert render_command_value('/plan integração') == '@architect, planeja essa feature: integração'


def test_render_exec():
    assert render_command_value('/exec') == '@architect, executa o plano aprovado'


def test_render_next():
    assert render_command_value('/next') == 'próximo agente, continua'


def test_render_ask():
    assert render_command_value('/ask Precisa de contexto?') == 'pergunta isso pro agente: Precisa de contexto?'


def test_unknown_command():
    assert render_command_value('/unknown') is None
