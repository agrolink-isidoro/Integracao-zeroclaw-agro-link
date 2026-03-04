"""Command dispatcher skeleton.

Provides a small parsing helper and a router that maps slash-commands to agent actions.
This is intentionally minimal; integrate with your agent runtime (chatbot/event consumer) to actually invoke agents.
"""
from typing import Tuple, List, Optional


def parse_command(message: str) -> Tuple[Optional[str], List[str]]:
    """Parse a message that may start with a slash command.

    Returns (command, args). If no slash command present, returns (None, []).
    Example: '/plan add feature X' -> ('/plan', ['add','feature','X'])
    """
    text = message.strip()
    if not text.startswith('/'):
        return None, []
    parts = text.split()
    command = parts[0]
    args = parts[1:]
    return command, args


COMMAND_MAP = {
    '/plan': {
        'agent': 'architect',
        'render': lambda args: f"@architect, planeja essa feature: {' '.join(args)}" if args else "@architect, planeja essa feature: <feature>"
    },
    '/exec': {
        'agent': 'architect',
        'render': lambda args: "@architect, executa o plano aprovado"
    },
    '/next': {
        'agent': 'flow',
        'render': lambda args: "próximo agente, continua"
    },
    '/ask': {
        'agent': 'any',
        'render': lambda args: f"pergunta isso pro agente: {' '.join(args)}" if args else "pergunta isso pro agente: <pergunta>"
    }
}


def render_command_value(message: str) -> Optional[str]:
    """Return the generated value string for the given message, or None if not a command."""
    command, args = parse_command(message)
    if not command:
        return None
    meta = COMMAND_MAP.get(command)
    if not meta:
        return None
    return meta['render'](args)


if __name__ == '__main__':
    # Simple manual test
    examples = [
        '/plan nova integração',
        '/exec',
        '/next',
        '/ask Qual o prazo?'
    ]
    for ex in examples:
        print(ex, '->', render_command_value(ex))
