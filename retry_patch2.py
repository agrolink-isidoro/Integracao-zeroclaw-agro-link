import re
path = '/home/agrolink/Integracao-zeroclaw-agro-link/integration-structure/zeroclaw/python/zeroclaw_tools/tools/agrolink_tools.py'
with open(path, 'r') as f:
    content = f.read()

# Update _fuzzy_resolve_maquina
old_maquina = '''    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get("/maquinas/equipamentos/")
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        # Se falhar a consulta, retorna sem resolver — o executor tentará depois
        return nome_usuario, []'''
new_maquina = '''    try:
        raw_resp = _get_cached(base_url, jwt_token, tenant_id, "/maquinas/equipamentos/")
        payload = json.loads(raw_resp)
        if "erro" in payload:
            return nome_usuario, []
    except Exception:
        return nome_usuario, []'''

content = content.replace(old_maquina, new_maquina)

# Update _fuzzy_resolve_talhao
old_talhao = '''    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get("/talhoes/")
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        return nome_usuario, []'''
new_talhao = '''    try:
        raw_resp = _get_cached(base_url, jwt_token, tenant_id, "/talhoes/")
        payload = json.loads(raw_resp)
        if "erro" in payload:
            return nome_usuario, []
    except Exception:
        return nome_usuario, []'''

content = content.replace(old_talhao, new_talhao)

# Update _resolve_produto_combustivel
old_combustivel = '''    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get("/estoque/produtos/")
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        return None'''
new_combustivel = '''    try:
        raw_resp = _get_cached(base_url, jwt_token, tenant_id, "/estoque/produtos/")
        payload = json.loads(raw_resp)
        if "erro" in payload:
            return None
    except Exception:
        return None'''

content = content.replace(old_combustivel, new_combustivel)

with open(path, 'w') as f:
    f.write(content)

print("Second patch applied!")
