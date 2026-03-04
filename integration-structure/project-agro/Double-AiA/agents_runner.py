#!/usr/bin/env python3
"""agents_runner.py
Simple CLI to discover agent `run:` metadata in .github/Agents/*.agent.md
and perform basic start/stop/status operations using the provided metadata.

Usage:
  python scripts/agents_runner.py list
  python scripts/agents_runner.py status <agent> [--dry-run]
  python scripts/agents_runner.py start <agent> [--dry-run] [--yes]
  python scripts/agents_runner.py stop <agent> [--dry-run]

This is an example/orchestrator for local use. It uses system commands (systemctl, curl)
so may require sudo for some operations.
"""

import sys
import subprocess
import glob
import os
import argparse
import shlex
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parents[1] / '.github' / 'Agents'
LOG_FILE = Path(__file__).resolve().parent / 'agents-runner.log'

def log(msg):
    with open(LOG_FILE, 'a') as f:
        f.write(msg + '\n')
    print(msg)


def read_file(path):
    return open(path, 'r', encoding='utf-8').read()


def extract_yaml_blocks(text):
    blocks = []
    start_token = '```yaml'
    i = 0
    while True:
        i = text.find(start_token, i)
        if i == -1:
            break
        i += len(start_token)
        j = text.find('```', i)
        if j == -1:
            break
        blocks.append(text[i:j].strip('\n'))
        i = j + 3
    return blocks


def parse_run_from_block(block_text):
    lines = block_text.splitlines()
    for idx, line in enumerate(lines):
        if line.strip().startswith('run:'):
            data = {}
            for l in lines[idx+1:]:
                if l.startswith('  '):
                    parts = l.strip().split(':', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip()
                        if val.startswith('"') and val.endswith('"'):
                            val = val[1:-1]
                        data[key] = val
                    continue
                else:
                    break
            return data
    return None


def discover_agents():
    agents = {}
    for path in glob.glob(str(AGENTS_DIR / '*.agent.md')):
        name_base = Path(path).stem
        name = name_base[:-6] if name_base.endswith('.agent') else name_base
        text = read_file(path)
        blocks = extract_yaml_blocks(text)
        run_meta = None
        for b in blocks:
            parsed = parse_run_from_block(b)
            if parsed:
                run_meta = parsed
                break
        agents[name] = {'file': path, 'run': run_meta}
    return agents


def run_cmd(cmd, check=False):
    log(f"RUN: {cmd}")
    r = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if r.stdout:
        log(r.stdout.strip())
    if r.stderr:
        log(r.stderr.strip())
    if check and r.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{r.stderr}")
    return r.returncode, r.stdout.strip(), r.stderr.strip()


def check_health(url):
    cmd = f"curl -sf {shlex.quote(url)} >/dev/null"
    rc, _, _ = run_cmd(cmd)
    return rc == 0


def status_agent(agent):
    run = agent.get('run')
    if not run:
        return 'no-run-block'
    if 'health_check' in run and run['health_check']:
        try:
            ok = check_health(run['health_check'])
            return 'running' if ok else 'stopped'
        except Exception:
            pass
    if 'status_cmd' in run and run['status_cmd']:
        rc, out, err = run_cmd(run['status_cmd'])
        o = out.strip().lower()
        if 'active' in o or 'running' in o:
            return 'running'
        return 'stopped'
    return 'unknown'


def start_agent(name, agent, dry_run=False, yes=False):
    run = agent.get('run')
    if not run:
        log(f"Agent {name} has no run metadata.")
        return False
    s = status_agent(agent)
    if s == 'running':
        log(f"{name} already running.")
        return True
    t = run.get('type', 'command')
    if t == 'systemd' and run.get('service_name'):
        cmd = f"sudo systemctl enable --now {shlex.quote(run['service_name'])}"
    elif run.get('start_command'):
        cmd = f"bash -lc \"nohup bash {run['start_command']} > /dev/null 2>&1 & echo $!\""
    else:
        log(f"No start method for {name}")
        return False
    if dry_run:
        log(f"DRY RUN: {cmd}")
        return True
    if not yes:
        resp = input(f"Execute: {cmd}? [y/N] ")
        if resp.lower() not in ('y', 'yes'):
            log('Aborted by user')
            return False
    try:
        rc, out, err = run_cmd(cmd)
        pid = None
        if out and out.strip().isdigit():
            pid = out.strip()
            svc_name = run.get('service_name') or name
            pidfile = f"/tmp/{svc_name}.pid"
            try:
                with open(pidfile, 'w') as f:
                    f.write(pid)
                log(f"Wrote pid {pid} to {pidfile}")
            except Exception as e:
                log(f"Failed to write pidfile: {e}")
        if rc != 0:
            log(f"Start command returned {rc}")
        for i in range(15):
            s = status_agent(agent)
            if s == 'running':
                log(f"{name} started successfully")
                return True
            import time; time.sleep(0.5)
        log(f"{name} did not report healthy status after start")
        return False
    except Exception as e:
        log(str(e))
        return False


def stop_agent(name, agent, dry_run=False):
    run = agent.get('run')
    if not run:
        log(f"Agent {name} has no run metadata.")
        return False
    t = run.get('type', 'command')
    if t == 'systemd' and run.get('service_name'):
        cmd = f"sudo systemctl stop {shlex.quote(run['service_name'])}"
    else:
        svc = run.get('service_name') or name
        pidfile = f"/tmp/{svc}.pid"
        if os.path.exists(pidfile):
            with open(pidfile, 'r') as f:
                pid = f.read().strip()
            cmd = f"kill {shlex.quote(pid)} || true && rm -f {shlex.quote(pidfile)}"
        elif run.get('start_command'):
            cmd = f"pkill -f {shlex.quote(run.get('start_command'))} || true"
        else:
            cmd = f"pkill -f {shlex.quote(svc)} || true"
    if dry_run:
        log(f"DRY RUN: {cmd}")
        return True
    rc, _, _ = run_cmd(cmd)
    if rc == 0:
        log(f"Stop command executed for {name}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', nargs='?', default='list', help='list|status|start|stop')
    parser.add_argument('agent', nargs='?', help='agent name')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--yes', action='store_true')
    args = parser.parse_args()

    agents = discover_agents()
    if args.action == 'list':
        print('Found agents:')
        for k,v in agents.items():
            print(f"- {k} (run: {'yes' if v['run'] else 'no'})")
        return
    if not args.agent:
        print('Specify agent name (e.g. architect)')
        return
    name = args.agent
    if name not in agents:
        print(f"Unknown agent: {name}")
        return
    ag = agents[name]
    if args.action == 'status':
        s = status_agent(ag)
        print(s)
        return
    if args.action == 'start':
        ok = start_agent(name, ag, dry_run=args.dry_run, yes=args.yes)
        print('OK' if ok else 'FAIL')
        return
    if args.action == 'stop':
        ok = stop_agent(name, ag, dry_run=args.dry_run)
        print('OK' if ok else 'FAIL')
        return
    print('Unknown action')

if __name__ == '__main__':
    main()
