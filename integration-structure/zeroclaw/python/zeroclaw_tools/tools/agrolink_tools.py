"""
Ferramentas ZeroClaw para integração com o Agrolink.

Cada função é um @tool do LangChain que chama a API REST do Agrolink
e cria Actions (draft) na fila de aprovação humana.

Todas as ferramentas retornam JSON string com o resultado da operação.
Nenhuma altera dados diretamente — o fluxo sempre passa pelo Action Queue.

Cobertura de formulários (todos os 4 módulos):
  Fazendas   : criar_proprietario, criar_fazenda, criar_area,
               criar_talhao, registrar_arrendamento
  Agricultura: criar_safra, registrar_colheita, registrar_operacao_agricola,
               registrar_manejo, registrar_ordem_servico_agricola
  Estoque    : criar_produto_estoque, registrar_entrada_estoque,
               registrar_saida_estoque, registrar_movimentacao_estoque
  Máquinas   : criar_equipamento, registrar_ordem_servico_maquina,
               registrar_manutencao_maquina
  Consultas  : consultar_actions_pendentes, consultar_estoque,
               consultar_talhoes, consultar_maquinas,
               consultar_safras_ativas, consultar_safras,
               consultar_sessoes_colheita_ativas, consultar_fazendas,
               consultar_proprietarios, consultar_colheitas,
               consultar_movimentacoes_estoque, consultar_vencimentos,
               consultar_lancamentos_financeiros
  Relatórios : relatorio_resumo_geral, relatorio_financeiro,
               relatorio_estoque, relatorio_agricultura,
               relatorio_comercial, relatorio_administrativo,
               relatorio_maquinas

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
from difflib import SequenceMatcher

import httpx
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# ── Client singleton por chamada ─────────────────────────────────────────────

def _client(base_url: str, jwt_token: str, tenant_id: str = "") -> httpx.Client:
    """Cria um client HTTP autenticado para a API Agrolink."""
    headers = {
        "Authorization": jwt_token
        if jwt_token.startswith("Bearer ")
        else f"Bearer {jwt_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if tenant_id:
        headers["X-Tenant-ID"] = tenant_id
        logger.debug(f"_client: Adding X-Tenant-ID={tenant_id}")
    else:
        logger.warning("_client: tenant_id is empty!")
    return httpx.Client(
        base_url=base_url.rstrip("/"),
        headers=headers,
        timeout=30.0,
    )


def _post_action(
    base_url: str,
    jwt_token: str,
    tenant_id: str,
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
        with _client(base_url, jwt_token, tenant_id) as c:
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


def _fuzzy_resolve_maquina(
    base_url: str,
    jwt_token: str,
    tenant_id: str,
    nome_usuario: str,
    threshold: float = 0.40,
) -> tuple[str | None, list[str]]:
    """
    Busca fuzzy do nome de máquina/equipamento informado pelo usuário
    contra os equipamentos cadastrados na API.

    Retorna (nome_correto, lista_disponiveis).
    Se não encontrar match acima do threshold, retorna (None, lista_disponiveis).
    """
    if not nome_usuario or not nome_usuario.strip():
        return None, []

    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get("/maquinas/equipamentos/")
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        # Se falhar a consulta, retorna sem resolver — o executor tentará depois
        return nome_usuario, []

    equipamentos = payload.get("results", payload) if isinstance(payload, dict) else payload
    if not equipamentos:
        return None, []

    input_lower = nome_usuario.strip().lower()
    input_tokens = input_lower.split()
    nomes_disponiveis: list[str] = []
    best_score = 0.0
    best_nome: str | None = None

    for eq in equipamentos:
        nome = (eq.get("nome") or "").strip()
        marca = (eq.get("marca") or "").strip()
        modelo = (eq.get("modelo") or "").strip()
        if not nome:
            continue
        nomes_disponiveis.append(nome)

        # --- match exato (case-insensitive) → retorno imediato ----------------
        if input_lower == nome.lower():
            return nome, nomes_disponiveis

        # --- candidatos para comparação ---------------------------------------
        candidatos = [
            nome.lower(),
            modelo.lower(),
            marca.lower(),
            f"{marca} {modelo}".lower(),
            f"{nome} {marca} {modelo}".lower(),
        ]

        # 1) SequenceMatcher do input inteiro contra cada candidato
        for cand in candidatos:
            ratio = SequenceMatcher(None, input_lower, cand).ratio()
            if ratio > best_score:
                best_score = ratio
                best_nome = nome

        # 2) SequenceMatcher de cada token do input contra cada candidato
        #    (captura abreviações como "Puma" ⊂ "PUMA 200")
        for token in input_tokens:
            for cand in candidatos:
                ratio = SequenceMatcher(None, token, cand).ratio()
                if ratio > best_score:
                    best_score = ratio
                    best_nome = nome

        # 3) icontains: se algum token significativo do input aparece no nome completo
        full_text = f"{nome} {marca} {modelo}".lower()
        matching_tokens = sum(1 for t in input_tokens if t in full_text)
        if input_tokens and matching_tokens > 0:
            token_ratio = matching_tokens / len(input_tokens)
            # Bonus: se pelo menos metade dos tokens bateu, considera forte
            combined = max(best_score, 0.35 + token_ratio * 0.35)
            if combined > best_score:
                best_score = combined
                best_nome = nome

    if best_score >= threshold and best_nome:
        logger.info(
            "_fuzzy_resolve_maquina: '%s' → '%s' (score=%.2f)",
            nome_usuario, best_nome, best_score,
        )
        return best_nome, nomes_disponiveis

    logger.warning(
        "_fuzzy_resolve_maquina: '%s' não encontrado (best_score=%.2f, best='%s')",
        nome_usuario, best_score, best_nome,
    )
    return None, nomes_disponiveis


def _fuzzy_resolve_talhao(
    base_url: str,
    jwt_token: str,
    tenant_id: str,
    nome_usuario: str,
    threshold: float = 0.40,
) -> tuple[str | None, list[str]]:
    """
    Busca fuzzy do nome de talhão informado pelo usuário
    contra os talhões cadastrados na API.

    Retorna (nome_correto, lista_disponiveis).
    Se não encontrar match acima do threshold, retorna (None, lista_disponiveis).
    """
    if not nome_usuario or not nome_usuario.strip():
        return None, []

    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get("/talhoes/")
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        return nome_usuario, []

    talhoes = payload.get("results", payload) if isinstance(payload, dict) else payload
    if not talhoes:
        return None, []

    input_lower = nome_usuario.strip().lower()
    input_tokens = input_lower.split()
    nomes_disponiveis: list[str] = []
    best_score = 0.0
    best_nome: str | None = None

    for t in talhoes:
        nome = (t.get("name") or t.get("nome") or "").strip()
        if not nome:
            continue
        nomes_disponiveis.append(nome)

        # --- match exato (case-insensitive) → retorno imediato ----------------
        if input_lower == nome.lower():
            return nome, nomes_disponiveis

        nome_lower = nome.lower()

        # 1) SequenceMatcher do input inteiro contra o nome
        ratio = SequenceMatcher(None, input_lower, nome_lower).ratio()
        if ratio > best_score:
            best_score = ratio
            best_nome = nome

        # 2) SequenceMatcher de cada token do input
        for token in input_tokens:
            r = SequenceMatcher(None, token, nome_lower).ratio()
            if r > best_score:
                best_score = r
                best_nome = nome

        # 3) icontains: se algum token significativo está no nome
        matching_tokens = sum(1 for tok in input_tokens if tok in nome_lower)
        if input_tokens and matching_tokens > 0:
            token_ratio = matching_tokens / len(input_tokens)
            combined = max(best_score, 0.35 + token_ratio * 0.35)
            if combined > best_score:
                best_score = combined
                best_nome = nome

    if best_score >= threshold and best_nome:
        logger.info(
            "_fuzzy_resolve_talhao: '%s' → '%s' (score=%.2f)",
            nome_usuario, best_nome, best_score,
        )
        return best_nome, nomes_disponiveis

    logger.warning(
        "_fuzzy_resolve_talhao: '%s' não encontrado (best_score=%.2f, best='%s')",
        nome_usuario, best_score, best_nome,
    )
    return None, nomes_disponiveis


def _resolve_produto_combustivel(
    base_url: str,
    jwt_token: str,
    tenant_id: str,
) -> str | None:
    """
    Busca o primeiro produto de combustível no estoque do tenant.
    Retorna o nome do produto ou None se não encontrar.
    """
    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get("/estoque/produtos/")
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        return None

    items = payload.get("results", payload) if isinstance(payload, dict) else payload
    if not items:
        return None

    # Prioridade: categoria combustível > nome diesel
    for item in items:
        cat = (item.get("categoria") or "").lower()
        if "combust" in cat:
            return item.get("nome")
    for item in items:
        nome = (item.get("nome") or "").lower()
        if "diesel" in nome or "gasolina" in nome or "combust" in nome:
            return item.get("nome")
    return None


def _get(base_url: str, jwt_token: str, tenant_id: str, path: str, params: dict | None = None) -> str:
    """Realiza GET na API Agrolink."""
    try:
        with _client(base_url, jwt_token, tenant_id) as c:
            resp = c.get(path, params=params or {})
            resp.raise_for_status()
            return resp.text
    except httpx.HTTPStatusError as exc:
        return json.dumps({"erro": exc.response.text})
    except Exception as exc:
        return json.dumps({"erro": str(exc)})


# ── Factory de tools com closures ─────────────────────────────────────────────

def get_agrolink_tools(base_url: str, jwt_token: str, tenant_id: str = "") -> list:
    """
    Retorna lista de LangChain tools configuradas com base_url, jwt_token e tenant_id.

    Args:
        base_url: URL base da API Agrolink (ex: "http://backend:8000/api")
        jwt_token: Token JWT do Isidoro (ex: "Bearer eyJ...")
        tenant_id: UUID do tenant para isolamento de dados (IMPORTANTÍSSIMO para multi-tenancy)

    Returns:
        Lista de BaseTool prontos para uso no ZeroclawAgent
    """

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO FAZENDAS
    # ═══════════════════════════════════════════════════════════════════════

    @tool
    def criar_proprietario(
        nome: str,
        cpf_cnpj: str,
        telefone: str = "",
        email: str = "",
        endereco: str = "",
    ) -> str:
        """
        Cadastra um novo proprietário rural no sistema.
        
        ⚠️ ESTE É O PRIMEIRO PASSO DA SEQUÊNCIA OBRIGATÓRIA:
        Proprietário → Fazenda → Área → Talhão
        
        SEMPRE pergunte TODOS os campos obrigatórios (nome*, cpf_cnpj*) antes de chamar.
        Campos opcionais (telefone, email, endereco) podem ser perguntados, mas não são bloqueantes.
        
        Ao usuário CONFIRMAR com "sim", "ok", "pode criar", "confirma", ou similar — chame IMEDIATAMENTE.
        Não volte a perguntar. Use valores vazios "" para opcionais não informados.

        Args:
            nome: Nome completo do proprietário(*obrigatório)
            cpf_cnpj: CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) — *obrigatório e único
            telefone: Telefone de contato com DDD (ex: 65 99999-9999)
            email: E-mail de contato
            endereco: Endereço completo (logradouro, cidade, estado)
            
        ⚠️ Após criar: próximo passo é SEMPRE criar_fazenda (que depende deste proprietário)
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="fazendas",
            action_type="criar_proprietario",
            draft_data={
                "nome": nome,
                "cpf_cnpj": cpf_cnpj,
                "telefone": telefone,
                "email": email,
                "endereco": endereco,
            },
        )

    @tool
    def criar_fazenda(
        name: str,
        matricula: str,
        proprietario: str,
    ) -> str:
        """
        Cadastra uma nova fazenda vinculada a um proprietário.
        
        ⚠️ SEGUNDO PASSO DA SEQUÊNCIA OBRIGATÓRIA:
        Proprietário → Fazenda → Área → Talhão
        
        OBRIGATÓRIO: O PROPRIETÁRIO DEVE EXISTIR PREVIAMENTE!
        Se não existir, ofereça criar primeiro (criar_proprietario).
        
        SEMPRE pergunte os 3 campos obrigatórios (name*, matricula*, proprietario*) antes de chamar.
        Ao usuário CONFIRMAR — chame IMEDIATAMENTE. Não repita resumos. Não faça mais perguntas.

        Args:
            name: Nome da fazenda(*obrigatório) — ex: "Fazenda Santa Maria"
            matricula: Registro/matrícula da fazenda(*obrigatório) — deve ser único, ex: "MAT-2024-001"
            proprietario: Nome do proprietário existente(*obrigatório) — será procurado no sistema
            
        ⚠️ Após criar: próximo passo é SEMPRE criar_area (que depende desta fazenda)
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="fazendas",
            action_type="criar_fazenda",
            draft_data={
                "name": name,
                "matricula": matricula,
                "proprietario": proprietario,
            },
        )

    @tool
    def criar_area(
        name: str,
        fazenda: str,
        proprietario: str,
        tipo: str = "propria",
        custo_arrendamento: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Cria uma área (seção/gleba) dentro de uma fazenda.
        
        ⚠️ TERCEIRO PASSO DA SEQUÊNCIA OBRIGATÓRIA:
        Proprietário → Fazenda → Área → Talhão
        
        OBRIGATÓRIO: A FAZENDA DEVE EXISTIR PREVIAMENTE!
        Se não existir, ofereça criar primeiro (criar_fazenda).
        
        SEMPRE pergunte os campos obrigatórios (name*, fazenda*, proprietario*, tipo*) antes de chamar:
        1. Nome da área
        2. Qual fazenda (valide se existe)
        3. Qual proprietário (valide se existe)
        4. Tipo de posse: 'propria' (padrão) ou 'arrendada'?
        
        Se tipo='arrendada', pergunte também: "Qual o custo em sacas/hectare?"
        
        Ao usuário CONFIRMAR — chame IMEDIATAMENTE. Não repita. Não faça mais perguntas.

        Args:
            name: Nome da área(*obrigatório) — ex: "Gleba Norte", "Sede"
            fazenda: Nome da fazenda à qual a área pertence(*obrigatório)
            proprietario: Nome do proprietário(*obrigatório)
            tipo: Tipo de posse(*obrigatório): 'propria' (padrão) ou 'arrendada'
            custo_arrendamento: Custo em sacas/hectare — obrigatório APENAS se tipo='arrendada'
            observacoes: Observações adicionais
            
        ⚠️ Após criar: próximo passo é SEMPRE criar_talhao (que depende desta área)
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="fazendas",
            action_type="criar_area",
            draft_data={
                "name": name,
                "fazenda": fazenda,
                "proprietario": proprietario,
                "tipo": tipo,
                "custo_arrendamento": custo_arrendamento,
                "observacoes": observacoes,
            },
        )

    @tool
    def criar_talhao(
        nome: str,
        area_ha: float,
        area_nome: str = "",
        fazenda: str = "",
        codigo: str = "",
        custo_arrendamento: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Cria um novo talhão (unidade de trabalho agrícola) dentro de uma área/fazenda.
        
        ⚠️ QUARTO PASSO DA SEQUÊNCIA OBRIGATÓRIA:
        Proprietário → Fazenda → Área → Talhão
        
        OBRIGATÓRIO: A ÁREA DEVE EXISTIR PREVIAMENTE!
        Se não existir, ofereça criar primeiro (criar_area).
        
        CAMPOS OBRIGATÓRIOS — sempre pergunte nesta ordem:
        1. Nome/código do talhão (ex: "Talhão A1", "Gleba Norte")
        2. Qual área pertence? (validar se existe)
        3. Qual a área em hectares?
        
        Campos opcionais (após os obrigatórios):
        4. Qual a fazenda? (para ajudar a resolver se 'area_nome' for ambíguo)
        5. Código interno do talhão?
        6. Custo de arrendamento?
        7. Observações?
        
        Ao usuário CONFIRMAR — chame IMEDIATAMENTE. Não volte a perguntar.

        Args:
            nome: Nome ou código do talhão(*obrigatório) — ex: "Talhão A1", "Gleba Norte"
            area_ha: Área do talhão em hectares(*obrigatório) — ex: 50.5
            area_nome: Nome da área à qual o talhão pertence (se vazio, usa primeira área da fazenda)
            fazenda: Nome da fazenda (ajuda a resolver área se 'area_nome' for ambíguo)
            codigo: Código interno do talhão
            custo_arrendamento: Custo de arrendamento em sacas/hectare
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="fazendas",
            action_type="criar_talhao",
            draft_data={
                "nome": nome,
                "area_ha": area_ha,
                "area_nome": area_nome,
                "fazenda": fazenda,
                "codigo": codigo,
                "custo_arrendamento": custo_arrendamento,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_arrendamento(
        arrendador: str,
        arrendatario: str,
        fazenda: str,
        areas: str,
        start_date: str,
        custo_sacas_hectare: float,
        end_date: str = "",
    ) -> str:
        """
        Registra um contrato de arrendamento de áreas rurais.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            arrendador: Nome/CPF do proprietário que CEDE a terra — obrigatório
            arrendatario: Nome/CPF do produtor que PAGA pelo uso da terra — obrigatório
            fazenda: Nome da fazenda onde estão as áreas arrendadas — obrigatório
            areas: Nomes das áreas arrendadas separados por vírgula — obrigatório
            start_date: Data de início do arrendamento (DD/MM/AAAA) — obrigatório
            custo_sacas_hectare: Custo que o arrendatário paga em sacas de soja/hectare — obrigatório
            end_date: Data de fim do arrendamento (DD/MM/AAAA) — deixar vazio se indeterminado
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="fazendas",
            action_type="registrar_arrendamento",
            draft_data={
                "arrendador": arrendador,
                "arrendatario": arrendatario,
                "fazenda": fazenda,
                "areas": areas,
                "start_date": start_date,
                "end_date": end_date,
                "custo_sacas_hectare": custo_sacas_hectare,
            },
        )

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO AGRICULTURA
    # ═══════════════════════════════════════════════════════════════════════

    @tool
    def criar_safra(
        fazenda: str,
        cultura: str,
        data_plantio: str,
        talhoes: str,
        variedades: str = "",
        status: str = "planejado",
        observacoes: str = "",
    ) -> str:
        """
        Cria uma nova safra (plantio) vinculando fazenda, cultura e talhões.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            fazenda: Nome da fazenda — obrigatório
            cultura: Nome da cultura (ex: Soja, Milho, Algodão) — obrigatório
            data_plantio: Data de plantio no formato DD/MM/AAAA — obrigatório
            talhoes: Nomes dos talhões separados por vírgula — obrigatório (mínimo 1)
            variedades: Variedade(s) correspondente(s) aos talhões (mesma ordem, separadas por vírgula)
            status: Status inicial: 'planejado' (padrão), 'em_andamento', 'finalizado', 'cancelado'
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="agricultura",
            action_type="criar_safra",
            draft_data={
                "fazenda": fazenda,
                "cultura": cultura,
                "data_plantio": data_plantio,
                "talhoes": talhoes,
                "variedades": variedades,
                "status": status,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_colheita(
        safra: str,
        talhao: str,
        data_colheita: str,
        producao_total: float,
        unidade: str = "sc",
        area_ha: float = 0.0,
        umidade_perc: float = 0.0,
        qualidade: str = "",
        placa: str = "",
        motorista: str = "",
        tara: float = 0.0,
        peso_bruto: float = 0.0,
        custo_transporte: float = 0.0,
        destino_tipo: str = "armazenagem_interna",
        local_destino: str = "",
        empresa_destino: str = "",
        nf_provisoria: str = "",
        peso_estimado: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Registra colheita de um talhão com informações de transporte e destino.
        ANTES de chamar esta ferramenta: use consultar_safras_ativas para listar as safras
        em andamento e confirmar com o usuário qual safra deve ser usada.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            safra: Nome ou identificação da safra ATIVA — obrigatório.
                   Consulte as safras ativas com consultar_safras_ativas antes de perguntar.
            talhao: Nome ou código do talhão pertencente à safra — obrigatório
            data_colheita: Data no formato DD/MM/AAAA — obrigatório
            producao_total: Total colhido na unidade escolhida — obrigatório
            unidade: Unidade de produção: 'sc' (sacas), 't' (toneladas), 'kg' — padrão 'sc'
            area_ha: Área colhida em hectares
            umidade_perc: Umidade dos grãos em porcentagem
            qualidade: Qualidade do grão (ex: Boa, Regular, Avariado)
            placa: Placa do veículo de transporte (ex: ABC1D23)
            motorista: Nome do motorista
            tara: Tara (peso do veículo vazio) em kg
            peso_bruto: Peso bruto carregado em kg
            custo_transporte: Custo do frete em reais
            destino_tipo: Destino: 'armazenagem_interna' (padrão), 'contrato_industria', 'armazenagem_geral'
            local_destino: Nome do local de armazenamento (se destino_tipo='armazenagem_interna')
            empresa_destino: Nome da empresa destino (se destino_tipo='contrato_industria' ou 'armazenagem_geral')
            nf_provisoria: Número da nota fiscal provisória
            peso_estimado: Peso estimado em kg (para destino indústria/armazenagem externa)
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="agricultura",
            action_type="colheita",
            draft_data={
                "safra": safra,
                "talhao": talhao,
                "data_colheita": data_colheita,
                "producao_total": producao_total,
                "unidade": unidade,
                "area_ha": area_ha,
                "umidade_perc": umidade_perc,
                "qualidade": qualidade,
                "placa": placa,
                "motorista": motorista,
                "tara": tara,
                "peso_bruto": peso_bruto,
                "custo_transporte": custo_transporte,
                "destino_tipo": destino_tipo,
                "local_destino": local_destino,
                "empresa_destino": empresa_destino,
                "nf_provisoria": nf_provisoria,
                "peso_estimado": peso_estimado,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_movimentacao_carga(
        safra: str,
        talhao: str,
        peso_bruto: float,
        tara: float,
        placa: str = "",
        motorista: str = "",
        destino_tipo: str = "armazenagem_interna",
        local_destino: str = "",
        empresa_destino: str = "",
        custo_transporte: float = 0.0,
        condicoes_graos: str = "",
        contrato_ref: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra uma movimentação de carga (caminhão carregado) durante a colheita.

        FLUXO OBRIGATÓRIO antes de chamar esta ferramenta:
          1. Chame consultar_sessoes_colheita_ativas() para verificar se há sessão ativa.
             - Se NÃO houver sessão ativa: informe ao usuário que ele deve iniciar uma
               sessão de colheita manualmente no sistema antes de registrar cargas.
             - Se houver sessão ativa: apresente a safra e pergunte ao usuário qual talhão.
          2. Pergunte o talhão onde a carga será realizada.
          3. Colete os dados do caminhão (placa, motorista, peso_bruto, tara) e destino.
          4. Chame esta ferramenta com todos os dados confirmados.

        Args:
            safra: Nome ou identificação da safra ATIVA (ex: "Soja", "Safra Soja") — obrigatório
            talhao: Nome ou código do talhão onde a carga será realizada — obrigatório
            peso_bruto: Peso bruto do caminhão carregado em kg — obrigatório
            tara: Tara (peso do caminhão vazio) em kg — obrigatório
            placa: Placa do veículo (ex: ABC1D23)
            motorista: Nome do motorista
            destino_tipo: Destino da carga: 'armazenagem_interna' (padrão),
                          'armazenagem_externa', 'venda_direta'
            local_destino: Nome do local de armazenamento interno (se destino_tipo='armazenagem_interna')
            empresa_destino: Nome da empresa destino (se destino_tipo='armazenagem_externa' ou 'venda_direta')
            custo_transporte: Custo do frete em reais
            condicoes_graos: Condições dos grãos (ex: Boa, Avariado, Úmido)
            contrato_ref: Número de nota fiscal provisória ou referência de contrato
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="agricultura",
            action_type="movimentacao_carga",
            draft_data={
                "safra": safra,
                "talhao": talhao,
                "peso_bruto": peso_bruto,
                "tara": tara,
                "placa": placa,
                "motorista": motorista,
                "destino_tipo": destino_tipo,
                "local_destino": local_destino,
                "empresa_destino": empresa_destino,
                "custo_transporte": custo_transporte,
                "condicoes_graos": condicoes_graos,
                "contrato_ref": contrato_ref,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_operacao_agricola(
        safra: str,
        talhao: str,
        data_operacao: str,
        tipo_operacao: str,
        trator: str = "",
        implemento: str = "",
        produto_insumo: str = "",
        quantidade_insumo: float = 0.0,
        observacoes: str = "",
    ) -> str:
        """
        Registra uma operação agrícola: pulverização, adubação, plantio, dessecação, etc.
        ANTES de chamar esta ferramenta:
        1. Use consultar_safras_ativas para listar safras e confirmar com o usuário.
        2. Use consultar_talhoes para verificar talhões disponíveis.
        3. Apresente os tipos de operação disponíveis ao usuário.
        Pergunte os campos obrigatórios antes de chamar. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            safra: Nome ou identificação da safra ATIVA — obrigatório.
                   Consulte as safras ativas com consultar_safras_ativas antes.
            talhao: Nome do talhão pertencente à safra — obrigatório.
                    Use consultar_talhoes para verificar os nomes corretos.
            data_operacao: Data no formato DD/MM/AAAA — obrigatório
            tipo_operacao: Tipo da operação — obrigatório. DEVE ser um dos valores abaixo.
                Apresente as opções ao usuário agrupadas por categoria:

                ** Preparação do Solo **
                - prep_limpeza (Limpeza de Área)
                - prep_aracao (Aração)
                - prep_gradagem (Gradagem)
                - prep_subsolagem (Subsolagem)
                - prep_correcao (Correção do Solo)

                ** Adubação **
                - adub_base (Adubação de Base)
                - adub_cobertura (Adubação de Cobertura)
                - adub_foliar (Adubação Foliar)

                ** Plantio **
                - plant_dessecacao (Dessecação)
                - plant_direto (Plantio Direto)
                - plant_convencional (Plantio Convencional)

                ** Tratos Culturais **
                - trato_irrigacao (Irrigação)
                - trato_poda (Poda)
                - trato_desbaste (Desbaste)
                - trato_amontoa (Amontoa)

                ** Pulverização (Fitossanitário) **
                - pulv_herbicida (Aplicação de Herbicida)
                - pulv_fungicida (Aplicação de Fungicida)
                - pulv_inseticida (Aplicação de Inseticida)
                - pulv_pragas (Controle de Pragas)
                - pulv_doencas (Controle de Doenças)
                - pulv_daninhas (Controle de Plantas Daninhas)

                ** Operações Mecânicas **
                - mec_rocada (Roçada)
                - mec_cultivo (Cultivo Mecânico)

            trator: Nome do trator/equipamento autopropelido (opcional).
                    Use consultar_maquinas para verificar nomes disponíveis.
            implemento: Nome do implemento/reboque (opcional).
                        Use consultar_maquinas para verificar nomes disponíveis.
            produto_insumo: Nome do produto/insumo do estoque utilizado (opcional).
                            Pergunte ao usuário se aplicável à operação.
            quantidade_insumo: Quantidade do insumo utilizado (opcional).
            observacoes: Observações adicionais (operador, condições climáticas, etc.)
        """
        # ── Fuzzy resolve talhão ──────────────────────────────────────────
        talhao_resolvido = talhao
        if talhao:
            nome_match, disponiveis = _fuzzy_resolve_talhao(
                base_url, jwt_token, tenant_id, talhao,
            )
            if nome_match is None and disponiveis:
                return json.dumps({
                    "sucesso": False,
                    "erro": f"Talhão '{talhao}' não encontrado. "
                            f"Talhões disponíveis: {', '.join(disponiveis)}. "
                            "Por favor, confirme o nome correto com o usuário.",
                })
            elif nome_match:
                talhao_resolvido = nome_match

        # ── Fuzzy resolve trator ──────────────────────────────────────────
        trator_resolvido = trator
        if trator:
            nome_match, disponiveis = _fuzzy_resolve_maquina(
                base_url, jwt_token, tenant_id, trator,
            )
            if nome_match is None and disponiveis:
                return json.dumps({
                    "sucesso": False,
                    "erro": f"Trator '{trator}' não encontrado. "
                            f"Equipamentos disponíveis: {', '.join(disponiveis)}. "
                            "Por favor, confirme o nome correto.",
                })
            elif nome_match:
                trator_resolvido = nome_match

        # ── Fuzzy resolve implemento ──────────────────────────────────────
        implemento_resolvido = implemento
        if implemento:
            nome_match, disponiveis = _fuzzy_resolve_maquina(
                base_url, jwt_token, tenant_id, implemento,
            )
            if nome_match is None and disponiveis:
                return json.dumps({
                    "sucesso": False,
                    "erro": f"Implemento '{implemento}' não encontrado. "
                            f"Equipamentos disponíveis: {', '.join(disponiveis)}. "
                            "Por favor, confirme o nome correto.",
                })
            elif nome_match:
                implemento_resolvido = nome_match

        draft = {
            "safra": safra,
            "talhao": talhao_resolvido,
            "data_operacao": data_operacao,
            "tipo_operacao": tipo_operacao,
            "trator": trator_resolvido,
            "implemento": implemento_resolvido,
            "observacoes": observacoes,
        }

        if produto_insumo:
            draft["produto_insumo"] = produto_insumo
            draft["quantidade_insumo"] = quantidade_insumo

        return _post_action(
            base_url, jwt_token, tenant_id,
            module="agricultura",
            action_type="operacao_agricola",
            draft_data=draft,
        )

    @tool
    def registrar_manejo(
        safra: str,
        tipo: str,
        data_manejo: str,
        descricao: str,
        talhoes: str,
        equipamento: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra uma atividade de manejo agrícola (preparo de solo, irrigação, controle de pragas, etc.).
        ANTES de chamar esta ferramenta: use consultar_safras_ativas para listar as safras
        em andamento e confirmar com o usuário qual safra deve ser usada.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            safra: Nome ou identificação da safra ATIVA — obrigatório.
                   Consulte as safras ativas com consultar_safras_ativas antes de perguntar.
            tipo: Tipo de manejo — obrigatório. Valores aceitos:
                  preparo_solo, aracao, gradagem, subsolagem, correcao_solo, calagem,
                  adubacao_base, adubacao_cobertura, adubacao_foliar,
                  dessecacao, plantio_direto, plantio_convencional,
                  irrigacao, poda, desbaste, amontoa,
                  controle_pragas, controle_doencas, controle_plantas_daninhas,
                  pulverizacao, aplicacao_herbicida, aplicacao_fungicida, aplicacao_inseticida,
                  capina, rocada, cultivo_mecanico, outro
            data_manejo: Data da atividade no formato DD/MM/AAAA — obrigatório
            descricao: Descrição detalhada do que foi realizado — obrigatório (mín. 3 caracteres)
            talhoes: Nomes dos talhões onde foi realizado, separados por vírgula — obrigatório (mín. 1)
            equipamento: Nome do equipamento/máquina utilizado
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="agricultura",
            action_type="registrar_manejo",
            draft_data={
                "tipo": tipo,
                "data_manejo": data_manejo,
                "descricao": descricao,
                "talhoes": talhoes,
                "safra": safra,
                "equipamento": equipamento,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_ordem_servico_agricola(
        safra: str,
        tarefa: str,
        data_inicio: str,
        talhoes: str,
        maquina: str = "",
        data_fim: str = "",
        status: str = "pendente",
        observacoes: str = "",
    ) -> str:
        """
        Cria uma ordem de serviço agrícola (programação de trabalho no campo).
        Use SOMENTE para tarefas de CAMPO (plantio, colheita, irrigação, pulverização,
        capina, etc.) vinculadas a uma safra e talhões.

        ⚠️  NÃO use para manutenção, reparo, revisão ou troca de peças/óleo de
            máquinas/equipamentos. Para isso, use registrar_manutencao_maquina.

        ANTES de chamar esta ferramenta: use consultar_safras_ativas para listar
        as safras e confirmar com o usuário qual safra deve ser usada.
        Pergunte os campos obrigatórios antes de chamar. Ao confirmar, CHAME imediatamente.

        Args:
            safra: Nome ou identificação da safra ATIVA — obrigatório.
                   Consulte as safras ativas com consultar_safras_ativas antes.
            tarefa: Descrição da tarefa de campo a ser executada — obrigatório
            data_inicio: Data/hora de início no formato DD/MM/AAAA HH:MM — obrigatório
            talhoes: Nomes dos talhões onde ocorrerá a operação, separados por vírgula — obrigatório
            maquina: Nome do equipamento/máquina a ser utilizado no campo
            data_fim: Data/hora prevista de fim no formato DD/MM/AAAA HH:MM
            status: Status: 'pendente' (padrão), 'em_andamento', 'concluida', 'cancelada'
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="agricultura",
            action_type="ordem_servico_agricola",
            draft_data={
                "tarefa": tarefa,
                "data_inicio": data_inicio,
                "talhoes": talhoes,
                "safra": safra,
                "maquina": maquina,
                "data_fim": data_fim,
                "status": status,
                "observacoes": observacoes,
            },
        )

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO ESTOQUE
    # ═══════════════════════════════════════════════════════════════════════

    @tool
    def criar_produto_estoque(
        nome: str,
        categoria: str,
        unidade: str,
        codigo: str = "",
        principio_ativo: str = "",
        concentracao: str = "",
        composicao_quimica: str = "",
        estoque_minimo: float = 0.0,
        custo_unitario: float = 0.0,
        preco_unitario: float = 0.0,
        fornecedor_nome: str = "",
        vencimento: str = "",
        lote: str = "",
        local_armazenamento: str = "",
        dosagem_padrao: float = 0.0,
        unidade_dosagem: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Cadastra um novo produto no estoque do sistema.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            nome: Nome completo do produto — obrigatório
            categoria: Categoria do produto — obrigatório. Valores aceitos:
                       Sementes, Fertilizantes, Corretivos, Herbicidas, Fungicidas,
                       Inseticidas, Acaricidas, Adjuvantes, Combustíveis e Lubrificantes,
                       Peças de manutenção, Construção, Correção de solo, Outros
            unidade: Unidade de medida (kg, g, L, mL, t, un, sc, cx, m3) — obrigatório
            codigo: Código interno do produto (ex: HERB-001)
            principio_ativo: Princípio ativo — obrigatório para herbicidas, fungicidas, inseticidas, acaricidas, fertilizantes
            concentracao: Concentração do princípio ativo (ex: 480 g/L)
            composicao_quimica: Composição química completa
            estoque_minimo: Quantidade mínima em estoque para alertas
            custo_unitario: Custo de compra por unidade em reais
            preco_unitario: Preço de venda por unidade em reais
            fornecedor_nome: Nome do fornecedor principal
            vencimento: Data de validade no formato DD/MM/AAAA
            lote: Número do lote
            local_armazenamento: Nome do local de armazenamento (galpão, câmara, etc.)
            dosagem_padrao: Dosagem padrão recomendada
            unidade_dosagem: Unidade da dosagem padrão (ex: L/ha, kg/ha)
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="estoque",
            action_type="criar_produto",
            draft_data={
                "codigo": codigo,
                "nome": nome,
                "categoria": categoria,
                "principio_ativo": principio_ativo,
                "concentracao": concentracao,
                "composicao_quimica": composicao_quimica,
                "unidade": unidade,
                "estoque_minimo": estoque_minimo,
                "custo_unitario": custo_unitario,
                "preco_unitario": preco_unitario,
                "fornecedor_nome": fornecedor_nome,
                "vencimento": vencimento,
                "lote": lote,
                "local_armazenamento": local_armazenamento,
                "dosagem_padrao": dosagem_padrao,
                "unidade_dosagem": unidade_dosagem,
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
        local_armazenamento: str = "",
        motivo: str = "compra",
        documento_referencia: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra entrada de produto no estoque (compra, recebimento, devolução, ajuste de entrada).
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            nome_produto: Nome do produto — obrigatório
            quantidade: Quantidade recebida — obrigatório
            unidade: Unidade (kg, L, sc, un, cx, t) — obrigatório
            data: Data de recebimento (DD/MM/AAAA) — obrigatório
            fornecedor: Nome do fornecedor
            codigo_produto: Código interno do produto
            valor_unitario: Custo unitário em reais
            numero_nf: Número da nota fiscal
            local_armazenamento: Nome do local de armazenamento (galpão, silo, câmara, etc.)
            motivo: Motivo da entrada: 'compra' (padrão), 'devolucao', 'ajuste', 'transferencia'
            documento_referencia: Número do documento de referência (pedido, contrato, etc.)
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
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
                "local_armazenamento": local_armazenamento,
                "motivo": motivo,
                "documento_referencia": documento_referencia,
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
        local_armazenamento: str = "",
        codigo_produto: str = "",
        motivo: str = "consumo",
        documento_referencia: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra saída de produto do estoque (uso em campo, venda, transferência, descarte).
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            nome_produto: Nome do produto — obrigatório
            quantidade: Quantidade saindo — obrigatório
            unidade: Unidade (kg, L, sc, un) — obrigatório
            data: Data da saída (DD/MM/AAAA) — obrigatório
            destino: Destino da saída (ex: Talhão A3, Usina XYZ, Descarte)
            local_armazenamento: Local de onde o produto está saindo (galpão, silo, etc.)
            codigo_produto: Código interno do produto
            motivo: Motivo da saída: 'consumo' (padrão), 'venda', 'descarte', 'transferencia', 'ajuste'
            documento_referencia: Número do documento de referência (ordem de serviço, NF, etc.)
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="estoque",
            action_type="saida_estoque",
            draft_data={
                "codigo_produto": codigo_produto,
                "nome_produto": nome_produto,
                "quantidade": quantidade,
                "unidade": unidade,
                "data": data,
                "destino": destino,
                "local_armazenamento": local_armazenamento,
                "motivo": motivo,
                "documento_referencia": documento_referencia,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_movimentacao_estoque(
        produto: str,
        quantidade: float,
        localizacao_origem: str,
        localizacao_destino: str,
        lote: str = "",
        observacao: str = "",
    ) -> str:
        """
        Registra transferência de produto entre dois locais/localizações dentro do estoque.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            produto: Nome ou código do produto a ser movimentado — obrigatório
            quantidade: Quantidade a transferir — obrigatório (deve ser > 0)
            localizacao_origem: Nome do local/localização de origem — obrigatório
            localizacao_destino: Nome do local/localização de destino — obrigatório (diferente da origem)
            lote: Número do lote do produto (se aplicável)
            observacao: Observações sobre a movimentação
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="estoque",
            action_type="movimentacao_interna",
            draft_data={
                "produto": produto,
                "quantidade": quantidade,
                "localizacao_origem": localizacao_origem,
                "localizacao_destino": localizacao_destino,
                "lote": lote,
                "observacao": observacao,
            },
        )

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO MÁQUINAS
    # ═══════════════════════════════════════════════════════════════════════

    @tool
    def criar_equipamento(
        nome: str,
        categoria: str,
        ano_fabricacao: int,
        valor_aquisicao: float,
        marca: str = "",
        modelo: str = "",
        numero_serie: str = "",
        potencia_cv: float = 0.0,
        capacidade_litros: float = 0.0,
        horimetro_atual: float = 0.0,
        data_aquisicao: str = "",
        status: str = "ativo",
        local_instalacao: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Cadastra um novo equipamento/máquina agrícola no sistema.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            nome: Nome completo do equipamento (ex: Trator John Deere 7200J) — obrigatório
            categoria: Categoria do equipamento — obrigatório. Ex: Trator, Colhedora,
                       Pulverizador, Plantadeira, Implemento, Veículo, Outros
            ano_fabricacao: Ano de fabricação (ex: 2020) — obrigatório
            valor_aquisicao: Valor de aquisição em reais — obrigatório
            marca: Marca/fabricante (ex: John Deere, Case, Massey Ferguson)
            modelo: Modelo específico (ex: 7200J, Magnum 310)
            numero_serie: Número de série/chassi
            potencia_cv: Potência em cavalos (CV) — para tratores e autopropelidos
            capacidade_litros: Capacidade do tanque de combustível em litros
            horimetro_atual: Leitura atual do horímetro (horas trabalhadas)
            data_aquisicao: Data de aquisição no formato DD/MM/AAAA
            status: Status: 'ativo' (padrão), 'inativo', 'manutenção', 'vendido'
            local_instalacao: Local onde o equipamento está instalado/guardado
            observacoes: Observações adicionais
        """
        return _post_action(
            base_url, jwt_token, tenant_id,
            module="maquinas",
            action_type="criar_equipamento",
            draft_data={
                "nome": nome,
                "categoria": categoria,
                "marca": marca,
                "modelo": modelo,
                "ano_fabricacao": ano_fabricacao,
                "numero_serie": numero_serie,
                "potencia_cv": potencia_cv,
                "capacidade_litros": capacidade_litros,
                "horimetro_atual": horimetro_atual,
                "valor_aquisicao": valor_aquisicao,
                "data_aquisicao": data_aquisicao,
                "status": status,
                "local_instalacao": local_instalacao,
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_abastecimento(
        maquina_nome: str,
        quantidade_litros: float,
        valor_unitario: float,
        data: str,
        horimetro: float = 0.0,
        responsavel: str = "",
        local_abastecimento: str = "",
        observacoes: str = "",
    ) -> str:
        """
        Registra um abastecimento de combustível em um equipamento/máquina agrícola.
        Use esta ferramenta SEMPRE que o usuário mencionar abastecimento, combustível,
        diesel, gasolina, litros, etc. em contexto de máquinas.
        Pergunte apenas os campos obrigatórios (maquina_nome, quantidade_litros,
        valor_unitario, data). Campos opcionais podem ser omitidos.
        O nome da máquina é resolvido automaticamente por fuzzy matching contra o
        cadastro — use o nome que o usuário informar; abreviações e nomes parciais
        são aceitos (ex: "Puma", "CR5", "colheitadeira").
        Quando o usuário confirmar, CHAME esta ferramenta IMEDIATAMENTE.

        Args:
            maquina_nome: Nome ou modelo da máquina (ex: CR5.85, Colheitadeira NH CR5.85) — obrigatório
            quantidade_litros: Quantidade de combustível em litros (ex: 305.0) — obrigatório
            valor_unitario: Preço por litro em reais (ex: 5.45) — obrigatório
            data: Data do abastecimento no formato DD/MM/AAAA — obrigatório
            horimetro: Leitura do horímetro em horas (ex: 2196.37) — opcional
            responsavel: Nome do responsável — opcional
            local_abastecimento: Local do abastecimento (ex: Fazenda, Posto XYZ) — opcional
            observacoes: Observações adicionais — opcional
        """
        # ── Fuzzy-match do nome da máquina contra o cadastro ────────────────
        nome_resolvido, disponiveis = _fuzzy_resolve_maquina(
            base_url, jwt_token, tenant_id, maquina_nome,
        )
        if nome_resolvido is None:
            dica = ""
            if disponiveis:
                dica = f" Equipamentos cadastrados: {', '.join(disponiveis[:8])}"
            return json.dumps({
                "sucesso": False,
                "erro": (
                    f"Equipamento '{maquina_nome}' não encontrado no cadastro."
                    f"{dica}. Confirme o nome correto com o usuário."
                ),
            })
        maquina_nome = nome_resolvido

        # ── Resolver produto de combustível no estoque ──────────────────────
        produto_combustivel = _resolve_produto_combustivel(
            base_url, jwt_token, tenant_id,
        )

        return _post_action(
            base_url, jwt_token, tenant_id,
            module="maquinas",
            action_type="abastecimento",
            draft_data={
                "maquina_nome": maquina_nome,
                "quantidade_litros": quantidade_litros,
                "valor_unitario": valor_unitario,
                "data": data,
                "horimetro": round(horimetro, 1),
                "responsavel": responsavel,
                "local_abastecimento": local_abastecimento,
                "produto_combustivel": produto_combustivel or "",
                "observacoes": observacoes,
            },
        )

    @tool
    def registrar_ordem_servico_maquina(
        equipamento: str,
        descricao_problema: str,
        tipo: str = "corretiva",
        prioridade: str = "media",
        status: str = "aberta",
        data_previsao: str = "",
        custo_mao_obra: float = 0.0,
        responsavel: str = "",
        prestador_servico: str = "",
        produto_insumo: str = "",
        quantidade_insumo: float = 1.0,
        observacoes: str = "",
    ) -> str:
        """
        Abre uma ordem de serviço de manutenção para um equipamento/máquina agrícola.
        Pergunte os campos obrigatórios antes de chamar. Campos opcionais podem ser omitidos. Ao confirmar, CHAME a ferramenta IMEDIATAMENTE.

        Args:
            equipamento: Nome do equipamento (ex: Trator John Deere 7200J) — obrigatório
            descricao_problema: Descrição detalhada do problema ou serviço a realizar — obrigatório
            tipo: Tipo de manutenção: 'corretiva' (padrão), 'preventiva', 'preditiva', 'melhoria'
            prioridade: Prioridade: 'baixa', 'media' (padrão), 'alta', 'critica'
            status: Status: 'aberta' (padrão), 'em_andamento', 'aguardando_pecas', 'concluida', 'cancelada'
            data_previsao: Data prevista para conclusão no formato DD/MM/AAAA
            custo_mao_obra: Custo de mão de obra em reais
            responsavel: Nome do responsável pela execução (mecânico interno)
            prestador_servico: Nome da empresa ou prestador externo (se terceirizado)
            produto_insumo: Nome do produto/insumo do estoque necessário (ex: Óleo Lubrificante, Filtro de Ar). O usuário poderá corrigir na aprovação.
            quantidade_insumo: Quantidade do insumo a consumir (padrão: 1)
            observacoes: Observações adicionais (peças necessárias, erros encontrados, etc.)
        """
        # ── Fuzzy-match do nome da máquina contra o cadastro ────────────────
        nome_resolvido, disponiveis = _fuzzy_resolve_maquina(
            base_url, jwt_token, tenant_id, equipamento,
        )
        if nome_resolvido is None:
            dica = ""
            if disponiveis:
                dica = f" Equipamentos cadastrados: {', '.join(disponiveis[:8])}"
            return json.dumps({
                "sucesso": False,
                "erro": (
                    f"Equipamento '{equipamento}' não encontrado no cadastro."
                    f"{dica}. Confirme o nome correto com o usuário."
                ),
            })
        equipamento = nome_resolvido

        return _post_action(
            base_url, jwt_token, tenant_id,
            module="maquinas",
            action_type="ordem_servico_maquina",
            draft_data={
                "equipamento": equipamento,
                "descricao_problema": descricao_problema,
                "tipo": tipo,
                "prioridade": prioridade,
                "status": status,
                "data_previsao": data_previsao,
                "custo_mao_obra": custo_mao_obra,
                "responsavel": responsavel,
                "prestador_servico": prestador_servico,
                "produto_insumo": produto_insumo,
                "quantidade_insumo": quantidade_insumo,
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
        km_rodados: float = 0.0,
        prestador_servico: str = "",
        prioridade: str = "media",
        observacoes: str = "",
    ) -> str:
        """
        Registra manutenção, revisão, reparo, troca de óleo/peças, abastecimento
        ou parada de uma máquina/equipamento.
        Use para QUALQUER serviço de manutenção, reparo ou revisão em tratores,
        colheitadeiras, pulverizadores e demais equipamentos (incluindo quando
        o reparo envolve componentes da safra, como caçamba, plataforma etc.).
        O registro aparecerá no módulo Máquinas > Manutenção.

        Pergunte os campos obrigatórios antes de chamar. Ao confirmar, CHAME imediatamente.

        Args:
            maquina_nome: Nome da máquina (ex: Colheitadeira NH CR5.85) — obrigatório.
                          Use consultar_maquinas para verificar nomes disponíveis.
            tipo_registro: Tipo do registro — obrigatório. Valores: manutencao, revisao,
                           reparo, abastecimento, troca_oleo, parada
            data: Data no formato DD/MM/AAAA — obrigatório
            descricao: Descrição detalhada do serviço ou ocorrência — obrigatório
            custo: Custo total em reais (peças + serviço)
            tecnico: Nome do técnico/mecânico responsável
            horas_trabalhadas: Leitura do horímetro no momento do registro (horas)
            km_rodados: Quilometragem atual (se aplicável ao veículo)
            prestador_servico: Nome da empresa ou prestador externo (se terceirizado)
            prioridade: Prioridade: 'baixa', 'media' (padrão), 'alta', 'critica'
            observacoes: Observações adicionais
        """
        # ── Fuzzy-match do nome da máquina contra o cadastro ────────────────
        nome_resolvido, disponiveis = _fuzzy_resolve_maquina(
            base_url, jwt_token, tenant_id, maquina_nome,
        )
        if nome_resolvido is None:
            dica = ""
            if disponiveis:
                dica = f" Equipamentos cadastrados: {', '.join(disponiveis[:8])}"
            return json.dumps({
                "sucesso": False,
                "erro": (
                    f"Equipamento '{maquina_nome}' não encontrado no cadastro."
                    f"{dica}. Confirme o nome correto com o usuário."
                ),
            })
        maquina_nome = nome_resolvido

        action_type_map = {
            "manutencao": "manutencao_maquina",
            "revisao": "manutencao_maquina",
            "reparo": "manutencao_maquina",
            "troca_oleo": "manutencao_maquina",
            "abastecimento": "abastecimento",
            "parada": "parada_maquina",
        }
        action_type = action_type_map.get(tipo_registro.lower(), "manutencao_maquina")
        return _post_action(
            base_url, jwt_token, tenant_id,
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
                "km_rodados": km_rodados,
                "prestador_servico": prestador_servico,
                "prioridade": prioridade,
                "observacoes": observacoes,
            },
        )

    # ═══════════════════════════════════════════════════════════════════════
    # CONSULTAS
    # ═══════════════════════════════════════════════════════════════════════

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
        return _get(base_url, jwt_token, tenant_id, "/actions/", params)

    @tool
    def consultar_estoque(produto: str = "") -> str:
        """
        Consulta o estoque atual de produtos cadastrados.

        Args:
            produto: Nome parcial do produto para filtrar. Deixar vazio para listar tudo.
        """
        params = {}
        if produto:
            params["search"] = produto
        return _get(base_url, jwt_token, tenant_id, "/estoque/produtos/", params)

    @tool
    def consultar_estoque_alertas() -> str:
        """
        Lista APENAS produtos com estoque baixo, negativo ou crítico.
        Use esta ferramenta no briefing diário para alertar sobre itens que precisam de atenção.
        Retorna apenas itens cuja quantidade atual está abaixo ou igual ao estoque mínimo.
        """
        raw = _get(base_url, jwt_token, tenant_id, "/estoque/produtos/", {})
        try:
            data = json.loads(raw)
            results = data.get("results", data) if isinstance(data, dict) else data
            if not isinstance(results, list):
                return raw  # fallback: retorna tudo se não conseguir parsear

            alertas = []
            for p in results:
                qty = float(p.get("quantidade_estoque", 0) or 0)
                minimo = float(p.get("estoque_minimo", 0) or 0)
                nome = p.get("nome", "?")
                unidade = p.get("unidade", "")
                # Ignora produtos de teste (E2E) e sem estoque mínimo definido
                if "e2e" in nome.lower() or "test" in nome.lower():
                    continue
                if qty < 0:
                    alertas.append(f"  ⚠️ {nome}: {qty} {unidade} (NEGATIVO!)")
                elif minimo > 0 and qty <= minimo:
                    alertas.append(f"  ⚠️ {nome}: {qty}/{minimo} {unidade} (abaixo do mínimo)")
                elif qty == 0 and minimo == 0:
                    # Produto com estoque zerado (pode ser relevante)
                    continue  # ignora se min também é zero

            if not alertas:
                return json.dumps({"alertas": [], "mensagem": "Nenhum produto com estoque baixo ou crítico."})
            return json.dumps({
                "alertas": alertas,
                "total_alertas": len(alertas),
                "mensagem": f"{len(alertas)} produto(s) com estoque baixo ou crítico."
            })
        except (json.JSONDecodeError, ValueError):
            return raw  # fallback

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
        return _get(base_url, jwt_token, tenant_id, "/talhoes/", params)

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
        return _get(base_url, jwt_token, tenant_id, "/maquinas/equipamentos/", params)

    @tool
    def consultar_safras_ativas(fazenda: str = "") -> str:
        """
        Lista as safras (plantios) ATIVAS no sistema — status 'em_andamento' ou 'planejado'.
        Use esta ferramenta SEMPRE antes de registrar colheita, operação agrícola, manejo
        ou ordem de serviço, para apresentar ao usuário quais safras estão disponíveis
        e confirmar qual deve ser vinculada ao registro.

        Args:
            fazenda: Filtrar pelo nome da fazenda. Deixar vazio para listar todas as fazendas.
        """
        params = {"status": "em_andamento,planejado"}
        if fazenda:
            params["search"] = fazenda
        return _get(base_url, jwt_token, tenant_id, "/agricultura/plantios/", params)

    @tool
    def consultar_safras(status: str = "", fazenda: str = "") -> str:
        """
        Lista safras (plantios) cadastradas no sistema com filtro opcional de status.
        Use consultar_safras_ativas para listar apenas as safras em andamento/planejadas.

        Args:
            status: Filtrar por status (planejado, em_andamento, finalizado, cancelado).
                    Deixar vazio para listar todas.
            fazenda: Filtrar pelo nome da fazenda. Deixar vazio para listar todas.
        """
        params = {}
        if status:
            params["status"] = status
        if fazenda:
            params["search"] = fazenda
        return _get(base_url, jwt_token, tenant_id, "/agricultura/plantios/", params)

    @tool
    def consultar_sessoes_colheita_ativas(fazenda: str = "") -> str:
        """
        Lista as sessões de colheita ATIVAS (status 'em_andamento') no sistema.
        Use esta ferramenta ANTES de registrar uma movimentação de carga para verificar
        se há uma sessão de colheita em andamento. Se não houver sessão ativa, informe
        ao usuário que ele deve iniciar uma sessão de colheita manualmente no sistema.

        Args:
            fazenda: Filtrar pelo nome da fazenda. Deixar vazio para todas as fazendas.
        """
        params = {"status": "em_andamento"}
        if fazenda:
            params["search"] = fazenda
        return _get(base_url, jwt_token, tenant_id, "/agricultura/harvest-sessions/", params)

    # ── Relatórios / Analytics ────────────────────────────────────────────────

    @tool
    def relatorio_resumo_geral() -> str:
        """
        Gera um RELATÓRIO RESUMO GERAL do sistema com KPIs de todos os módulos:
        áreas cultivadas, receita/despesa do mês, saldo, produtos em estoque,
        máquinas ativas, total de fazendas, vencimentos próximos.

        Use quando o usuário pedir: "resumo geral", "como está a fazenda?",
        "me dê um panorama", "dashboard", "visão geral".
        """
        return _get(base_url, jwt_token, tenant_id, "/dashboard/resumo/")

    @tool
    def relatorio_financeiro(periodo_dias: int = 30) -> str:
        """
        Gera um relatório FINANCEIRO detalhado com:
        - Caixa disponível no período
        - Saldo de contas bancárias
        - Vencimentos próximos e atrasados
        - Transferências pendentes
        - Financiamentos e empréstimos ativos
        - Fluxo de caixa diário e mensal

        Use quando o usuário pedir: "relatório financeiro", "como estão as finanças?",
        "fluxo de caixa", "vencimentos", "contas a pagar", "situação financeira".

        Args:
            periodo_dias: Período em dias para análise (padrão: 30 dias).
        """
        return _get(base_url, jwt_token, tenant_id, "/dashboard/financeiro/", {"period": periodo_dias})

    @tool
    def relatorio_estoque() -> str:
        """
        Gera um relatório de ESTOQUE com:
        - Valor total em estoque (R$)
        - Total de produtos cadastrados
        - Produtos abaixo do estoque mínimo (lista com nomes e quantidades)
        - Movimentações dos últimos 7 dias (entradas vs saídas)

        Use quando o usuário pedir: "relatório de estoque", "como está o estoque?",
        "produtos em falta", "estoque baixo", "valor do estoque",
        "movimentações de estoque".
        """
        return _get(base_url, jwt_token, tenant_id, "/dashboard/estoque/")

    @tool
    def relatorio_agricultura() -> str:
        """
        Gera um relatório de AGRICULTURA com:
        - Plantios ativos e total do ano
        - Produção real colhida (kg e sacas de 60kg)
        - Produção estimada (kg e sacas)
        - Produção por sessões de colheita
        - Top 10 talhões por produção (kg e sacas)

        Use quando o usuário pedir: "relatório de agricultura", "como está a produção?",
        "total de colheitas", "produção por talhão", "safras ativas",
        "quanto colhemos este ano?", "produtividade".
        """
        return _get(base_url, jwt_token, tenant_id, "/dashboard/agricultura/")

    @tool
    def relatorio_comercial() -> str:
        """
        Gera um relatório COMERCIAL com:
        - Fornecedores ativos e total
        - Vendas do mês (quantidade e valor total)
        - Compras do mês (quantidade e valor total)
        - Contratos vencendo nos próximos 30 dias
        - Contratos ativos

        Use quando o usuário pedir: "relatório comercial", "vendas do mês",
        "compras do mês", "fornecedores", "contratos", "situação comercial".
        """
        return _get(base_url, jwt_token, tenant_id, "/dashboard/comercial/")

    @tool
    def relatorio_administrativo() -> str:
        """
        Gera um relatório ADMINISTRATIVO com:
        - Folha de pagamento do mês (total e quantidade)
        - Despesas administrativas do mês
        - Total de funcionários (ativos vs total)

        Use quando o usuário pedir: "relatório administrativo", "folha de pagamento",
        "despesas admin", "funcionários", "RH".
        """
        return _get(base_url, jwt_token, tenant_id, "/dashboard/administrativo/")

    @tool
    def relatorio_maquinas() -> str:
        """
        Gera um relatório de MÁQUINAS E EQUIPAMENTOS com lista de equipamentos,
        status, e informações de manutenção.

        Use quando o usuário pedir: "relatório de máquinas", "como estão as máquinas?",
        "equipamentos", "manutenções pendentes", "status das máquinas".
        """
        return _get(base_url, jwt_token, tenant_id, "/maquinas/equipamentos/")

    @tool
    def consultar_fazendas() -> str:
        """
        Lista todas as fazendas cadastradas com informações de proprietário, 
        matrícula e áreas.

        Use quando o usuário pedir: "listar fazendas", "quais fazendas temos?",
        "informações das propriedades".
        """
        return _get(base_url, jwt_token, tenant_id, "/fazendas/fazendas/")

    @tool
    def consultar_proprietarios() -> str:
        """
        Lista todos os proprietários rurais cadastrados no sistema.

        Use quando o usuário pedir: "listar proprietários", "quem são os donos?",
        "proprietários cadastrados".
        """
        return _get(base_url, jwt_token, tenant_id, "/fazendas/proprietarios/")

    @tool
    def consultar_colheitas(ano: int = 0) -> str:
        """
        Lista as colheitas registradas no sistema. Pode filtrar por ano.

        Use quando o usuário pedir: "listar colheitas", "colheitas do ano",
        "histórico de colheitas".

        Args:
            ano: Ano para filtrar (ex: 2026). 0 para listar todas.
        """
        params = {}
        if ano > 0:
            params["year"] = ano
        return _get(base_url, jwt_token, tenant_id, "/agricultura/colheitas/", params)

    @tool
    def consultar_movimentacoes_estoque(tipo: str = "", produto: str = "", dias: int = 30) -> str:
        """
        Lista movimentações de estoque recentes (entradas, saídas, ajustes).

        Use quando o usuário pedir: "movimentações de estoque", "entradas e saídas",
        "histórico de estoque", "o que entrou/saiu do estoque".

        Args:
            tipo: Filtrar por tipo: 'entrada', 'saida', ou vazio para todas.
            produto: Filtrar pelo nome do produto.
            dias: Período em dias para buscar (padrão: 30).
        """
        params = {}
        if tipo:
            params["tipo"] = tipo
        if produto:
            params["search"] = produto
        if dias:
            params["days"] = dias
        return _get(base_url, jwt_token, tenant_id, "/estoque/movimentacoes/", params)

    @tool
    def consultar_vencimentos(status: str = "pendente", dias: int = 30) -> str:
        """
        Lista vencimentos financeiros (contas a pagar/receber).

        Use quando o usuário pedir: "vencimentos", "contas a pagar",
        "o que vence essa semana", "pagamentos pendentes".

        Args:
            status: Status do vencimento: 'pendente', 'pago', 'atrasado'. Padrão: pendente.
            dias: Período em dias à frente para buscar. Padrão: 30.
        """
        params = {"status": status}
        if dias:
            params["days"] = dias
        return _get(base_url, jwt_token, tenant_id, "/financeiro/vencimentos/", params)

    @tool
    def consultar_lancamentos_financeiros(tipo: str = "", dias: int = 30) -> str:
        """
        Lista lançamentos financeiros recentes (receitas e despesas).

        Use quando o usuário pedir: "lançamentos", "receitas e despesas",
        "gastos do mês", "entradas financeiras".

        Args:
            tipo: Filtrar por tipo: 'entrada', 'saida', ou vazio para todos.
            dias: Período em dias para buscar (padrão: 30).
        """
        params = {}
        if tipo:
            params["tipo"] = tipo
        if dias:
            params["days"] = dias
        return _get(base_url, jwt_token, tenant_id, "/financeiro/lancamentos/", params)

    return [
        # Fazendas
        criar_proprietario,
        criar_fazenda,
        criar_area,
        criar_talhao,
        registrar_arrendamento,
        # Agricultura
        criar_safra,
        registrar_colheita,
        registrar_movimentacao_carga,
        registrar_operacao_agricola,
        registrar_manejo,
        registrar_ordem_servico_agricola,
        # Estoque
        criar_produto_estoque,
        registrar_entrada_estoque,
        registrar_saida_estoque,
        registrar_movimentacao_estoque,
        # Máquinas
        criar_equipamento,
        registrar_abastecimento,
        registrar_ordem_servico_maquina,
        registrar_manutencao_maquina,
        # Consultas
        consultar_actions_pendentes,
        consultar_estoque,
        consultar_estoque_alertas,
        consultar_talhoes,
        consultar_maquinas,
        consultar_safras_ativas,
        consultar_safras,
        consultar_sessoes_colheita_ativas,
        consultar_fazendas,
        consultar_proprietarios,
        consultar_colheitas,
        consultar_movimentacoes_estoque,
        consultar_vencimentos,
        consultar_lancamentos_financeiros,
        # Relatórios / Analytics
        relatorio_resumo_geral,
        relatorio_financeiro,
        relatorio_estoque,
        relatorio_agricultura,
        relatorio_comercial,
        relatorio_administrativo,
        relatorio_maquinas,
    ]
