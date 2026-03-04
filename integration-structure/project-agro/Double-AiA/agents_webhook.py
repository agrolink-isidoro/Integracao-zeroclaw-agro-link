#!/usr/bin/env python3
"""Simple webhook server to map chat slash commands to agents_runner actions.

Expected JSON payload (generic):
{
  "text": "@architect /start",
  "sender": "user"
}

Security: set environment variable AGENTS_WEBHOOK_SECRET and include header X-Agents-Secret
with that value in webhook requests.
"""
from flask import Flask, request, jsonify
import os
import re
import shlex
import subprocess

APP = Flask(__name__)
SECRET = os.environ.get('AGENTS_WEBHOOK_SECRET')
RUNNER = os.environ.get('AGENTS_RUNNER', 'python3 scripts/agents_runner.py')

def log(msg):
    print(msg)

def parse_text(text):
    # find @agent and the first slash command
    m_agent = re.search(r'@([a-zA-Z0-9_-]+)', text)
    m_cmd = re.search(r'/(start|stop|status|exec|plan|next|ask)\b', text)
    agent = m_agent.group(1) if m_agent else None
    cmd = m_cmd.group(1) if m_cmd else None
    return agent, cmd

@APP.route('/webhook', methods=['POST'])
def webhook():
    # simple secret check
    header = request.headers.get('X-Agents-Secret')
    if SECRET and header != SECRET:
        return jsonify({'ok': False, 'error': 'invalid secret'}), 403
    payload = request.get_json(force=True, silent=True) or {}
    text = payload.get('text') or payload.get('command') or ''
    if not text:
        return jsonify({'ok': False, 'error': 'missing text'}), 400
    agent, cmd = parse_text(text)
    if not agent or not cmd:
        return jsonify({'ok': False, 'error': 'could not parse command'}), 400
    action_map = {
        'start': 'start',
        'stop': 'stop',
        'status': 'status',
        'exec': 'start',
        'plan': 'status',
        'next': 'status',
        'ask': 'status',
    }
    action = action_map.get(cmd, 'status')
    # build runner command
    cmd_list = [shlex.split(RUNNER)[0]] + shlex.split(' '.join(shlex.split(RUNNER)[1:])) if isinstance(RUNNER, str) else [RUNNER]
    # simpler: call via shell for now
    shell_cmd = f"{RUNNER} {action} {shlex.quote(agent)} --yes"
    log(f"Executing: {shell_cmd}")
    try:
        r = subprocess.run(shell_cmd, shell=True, capture_output=True, text=True, timeout=30)
        out = r.stdout.strip() + '\n' + r.stderr.strip()
        return jsonify({'ok': True, 'action': action, 'agent': agent, 'rc': r.returncode, 'output': out})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('AGENTS_WEBHOOK_PORT', 5002))
    APP.run(host='0.0.0.0', port=port)
