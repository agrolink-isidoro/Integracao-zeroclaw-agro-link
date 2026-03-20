import re
path = '/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/zeroclaw/python/zeroclaw_tools/tools/agrolink_tools.py'
with open(path, 'r') as f:
    content = f.read()

# Add retry logic
retry_fn = '''
import time

def _with_retries(func, max_retries=3, base_delay=1.0):
    for attempt in range(max_retries):
        try:
            return func()
        except (httpx.ConnectError, httpx.TimeoutException, httpx.ReadTimeout, httpx.NetworkError) as e:
            if attempt == max_retries - 1:
                logger.error(f"Falha de conexão persistente na API: {str(e)}")
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning(f"Erro de conexão na API ({str(e)}). Retentando {attempt+1}/{max_retries} em {delay}s...")
            time.sleep(delay)
'''

content = content.replace('import json', 'import json\nimport time')

# Update _post_action
old_post = '''    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.post("/actions/", json=payload)
            resp.raise_for_status()
            data = resp.json()'''

new_post = '''    try:
        def _do_post():
            with _client(base_url, jwt_token, tenant_id) as c:
                resp = c.post("/actions/", json=payload)
                resp.raise_for_status()
                return resp.json()
        
        data = _with_retries(_do_post)'''

# Update _get
old_get = '''    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get(path, params=params or {})
            resp.raise_for_status()
            return resp.text'''

new_get = '''    try:
        def _do_get():
            with _client(base_url, jwt_token, tenant_id) as c:
                resp = c.get(path, params=params or {})
                resp.raise_for_status()
                return resp.text
        return _with_retries(_do_get)'''

if 'def _with_retries(' not in content:
    content = content.replace('import hashlib\nimport os', 'import hashlib\nimport os\n' + retry_fn)
    content = content.replace(old_post, new_post)
    content = content.replace(old_get, new_get)

    with open(path, 'w') as f:
        f.write(content)
    print("Patch applied for backoff!")
else:
    print("Already applied!")
