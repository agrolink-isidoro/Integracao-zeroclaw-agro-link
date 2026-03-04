#!/usr/bin/env python3
"""Implementer worker
Polls .github/Agents/requests for open request files and executes tasks.
- Finds `Task: ` line with a markdown path like `tasks/sobe_frontend.md`.
- Extracts the first fenced code block under "Comandos sugeridos" or full file code blocks to run.
- Executes commands in a safe shell (nohup where appropriate), captures stdout/stderr to .github/Agents/task-logs/<request>.log
- Updates the request file status (Status: in-progress -> completed|failed) and appends a timestamp and log path.
"""
import time
from pathlib import Path
import re
import datetime
import subprocess

ROOT = Path(__file__).resolve().parents[2]
REQUESTS_DIR = ROOT / '.github' / 'Agents' / 'requests'
TASKS_DIR = ROOT / 'tasks'
LOGS_DIR = ROOT / '.github' / 'Agents' / 'task-logs'
LOGS_DIR.mkdir(parents=True, exist_ok=True)
POLL_INTERVAL = int(env_interval := (int(__import__('os').environ.get('IMPLEMENTER_POLL_SEC', '10'))))


def now_iso():
    return datetime.datetime.utcnow().isoformat() + 'Z'


def list_requests():
    return sorted(REQUESTS_DIR.glob('implementer_exec_*.md'))


def read_task_path(req_text):
    m = re.search(r"Task:\s*`([^`]+)`", req_text)
    return m.group(1).strip() if m else None


def extract_commands(task_text):
    # Find first fenced code block with bash or shell, else any fenced block
    m = re.search(r"```(?:bash|sh|shell|cmd)?\n([\s\S]*?)\n```", task_text)
    if m:
        return m.group(1).strip()
    return None


def mark_status(req_path: Path, status: str, note: str = ''):
    txt = req_path.read_text(encoding='utf-8')
    if 'Status:' in txt:
        txt = re.sub(r"Status:\s*.*", f"Status: {status}", txt, count=1)
    else:
        txt += f"\nStatus: {status}\n"
    if note:
        txt += f"\n{note}\n"
    req_path.write_text(txt, encoding='utf-8')


def append_log_link(req_path: Path, log_path: Path):
    txt = req_path.read_text(encoding='utf-8')
    txt += f"\nLog: {log_path}\n"
    req_path.write_text(txt, encoding='utf-8')


def run_commands(cmds: str, cwd: Path, logfile: Path):
    logfile.parent.mkdir(parents=True, exist_ok=True)
    with open(logfile, 'wb') as f:
        proc = subprocess.Popen(cmds, shell=True, cwd=str(cwd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, executable='/bin/bash')
        for line in proc.stdout:
            f.write(line)
            f.flush()
        rc = proc.wait()
    return rc


def process_request(req_path: Path):
    print(f"Processing {req_path}")
    txt = req_path.read_text(encoding='utf-8')
    task_rel = read_task_path(txt)
    if not task_rel:
        mark_status(req_path, 'failed', 'No task reference found')
        return
    task_path = ROOT / task_rel
    if not task_path.exists():
        mark_status(req_path, 'failed', f'Task file not found: {task_path}')
        return
    task_text = task_path.read_text(encoding='utf-8')
    cmds = extract_commands(task_text)
    if not cmds:
        # As fallback, try to extract all code blocks
        cmds = '\n'.join(re.findall(r"```[\s\S]*?\n([\s\S]*?)\n```", task_text))
    if not cmds:
        mark_status(req_path, 'awaiting-manual', 'No automated commands found; requires manual implementation or PR')
        return
    mark_status(req_path, 'in-progress', f'Started at {now_iso()}')
    logfile = LOGS_DIR / (req_path.stem + '.log')
    rc = run_commands(cmds, ROOT, logfile)
    append_log_link(req_path, logfile)
    if rc == 0:
        mark_status(req_path, 'completed', f'Completed at {now_iso()}')
    else:
        mark_status(req_path, 'failed', f'Failed at {now_iso()} (rc={rc})')


def main():
    print('Implementer worker started - polling for tasks')
    while True:
        try:
            for req in list_requests():
                content = req.read_text(encoding='utf-8')
                if 'Status: open' in content or 'Status:' not in content:
                    process_request(req)
        except Exception as e:
            print('Worker error:', e)
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
