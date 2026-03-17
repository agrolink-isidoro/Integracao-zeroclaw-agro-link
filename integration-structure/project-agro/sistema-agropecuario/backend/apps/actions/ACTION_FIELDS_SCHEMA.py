"""
Schema completo de campos REQUIRED vs OPTIONAL para cada action_type do sistema Agrolink.

Gerado por cross-reference entre:
  - Models (apps/fazendas|agricultura|estoque|maquinas/models.py)
  - Executors (apps/actions/executors/*.py)
  - AI Tools (zeroclaw/python/zeroclaw_tools/tools/agrolink_tools.py)

Usado pelo Isidoro para saber EXATAMENTE quais perguntas fazer ao usuário
antes de chamar cada ferramenta.

Última atualização: 2026-03-05
"""

ACTION_FIELDS_SCHEMA = {

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO FAZENDAS
    # ═══════════════════════════════════════════════════════════════════════

    "criar_proprietario": {
        "action_type": "criar_proprietario",
        "module": "fazendas",
        "model_target": "Proprietario",
        "description": "Cadastra um novo proprietário rural (pessoa física ou jurídica)",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": "Nome completo do proprietário",
                    "example": "João Carlos da Silva",
                },
                {
                    "name": "cpf_cnpj",
                    "type": "str",
                    "max_length": 20,
                    "description": "CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) — único no sistema",
                    "example": "123.456.789-00",
                },
            ],
            "optional": [
                {
                    "name": "telefone",
                    "type": "str",
                    "max_length": 20,
                    "description": "Telefone de contato com DDD",
                    "example": "65 99999-9999",
                    "default": "",
                },
                {
                    "name": "email",
                    "type": "str",
                    "description": "E-mail de contato",
                    "example": "joao@fazenda.com",
                    "default": "",
                },
                {
                    "name": "endereco",
                    "type": "str",
                    "description": "Endereço completo (logradouro, cidade, estado)",
                    "example": "Rod. MT-130, Km 45, Primavera do Leste - MT",
                    "default": "",
                },
            ],
        },
        "related_lookups": [],
        "validation_notes": [
            "cpf_cnpj deve ser único no sistema — se já existir, retorna o proprietário existente",
            "nome é obrigatório e não pode estar vazio",
        ],
    },

    "criar_fazenda": {
        "action_type": "criar_fazenda",
        "module": "fazendas",
        "model_target": "Fazenda",
        "description": "Cadastra uma nova fazenda vinculada a um proprietário existente",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": "Nome da fazenda",
                    "example": "Fazenda São João",
                    "tool_param_name": "name",
                    "note": "No executor é lido como 'nome', no tool é enviado como 'name'. Preferir 'nome'.",
                },
                {
                    "name": "matricula",
                    "type": "str",
                    "max_length": 100,
                    "description": "Registro/matrícula da fazenda — único no sistema",
                    "example": "MAT-2024-001",
                },
                {
                    "name": "proprietario",
                    "type": "str",
                    "description": "Nome do proprietário (busca por iexact depois icontains)",
                    "example": "João Carlos da Silva",
                },
            ],
            "optional": [],
        },
        "related_lookups": [
            "proprietario (str) → Proprietario.nome (iexact, fallback icontains)",
        ],
        "validation_notes": [
            "matricula deve ser única — se já existir, retorna a fazenda existente",
            "proprietario deve existir previamente; caso contrário, erro",
            "ATENÇÃO: o tool envia 'name' mas o executor lê 'nome' — garantir consistência",
        ],
    },

    "criar_area": {
        "action_type": "criar_area",
        "module": "fazendas",
        "model_target": "Area",
        "description": "Cria uma área (seção/gleba/matrícula) dentro de uma fazenda",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": "Nome da área",
                    "example": "Gleba Norte",
                    "tool_param_name": "name",
                },
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda à qual a área pertence",
                    "example": "Fazenda São João",
                },
            ],
            "optional": [
                {
                    "name": "tipo",
                    "type": "str",
                    "description": "Tipo de posse da área",
                    "default": "propria",
                    "choices": [
                        ("propria", "Própria"),
                        ("arrendada", "Arrendada"),
                    ],
                    "example": "propria",
                },
                {
                    "name": "custo_arrendamento",
                    "type": "Decimal",
                    "description": "Custo em sacas/hectare — relevante APENAS se tipo='arrendada'",
                    "example": 12.5,
                    "default": None,
                },
            ],
        },
        "related_lookups": [
            "fazenda (str) → Fazenda.name (iexact, fallback icontains)",
            "proprietario é auto-derivado da fazenda (fazenda.proprietario)",
        ],
        "validation_notes": [
            "tipo deve ser 'propria' ou 'arrendada' — qualquer outro valor vira 'propria'",
            "custo_arrendamento só é salvo se tipo='arrendada'",
        ],
    },

    "criar_talhao": {
        "action_type": "criar_talhao",
        "module": "fazendas",
        "model_target": "Talhao",
        "description": "Cria um talhão (unidade de trabalho agrícola) dentro de uma área/fazenda",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": "Nome ou código do talhão",
                    "example": "Talhão A1",
                },
            ],
            "optional": [
                {
                    "name": "area",
                    "type": "str",
                    "description": "Nome da área (seção/gleba) à qual o talhão pertence",
                    "example": "Gleba Norte",
                    "note": "Se não informado, usa a primeira área da fazenda",
                    "tool_param_name": "area_nome",
                },
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda — ajuda a resolver a área quando 'area' é ambíguo",
                    "example": "Fazenda São João",
                },
                {
                    "name": "area_hectares",
                    "type": "Decimal",
                    "description": "Área do talhão em hectares",
                    "example": 150.5,
                    "note": "Aceita também como 'area_size' ou 'area_ha' (mapeamento automático)",
                    "tool_param_name": "area_ha",
                },
                {
                    "name": "custo_arrendamento",
                    "type": "Decimal",
                    "description": "Custo de arrendamento em sacas/hectare (se aplicável)",
                    "example": 10.0,
                    "default": None,
                },
            ],
        },
        "related_lookups": [
            "area (str) → Area.name (iexact, fallback icontains, filtrado por fazenda se informada)",
            "fazenda (str) → Fazenda.name (icontains) — fallback para encontrar a primeira área",
        ],
        "validation_notes": [
            "É necessário informar 'area' e/ou 'fazenda' para resolver onde criar o talhão",
            "Se nenhuma área for encontrada, o executor lança erro",
        ],
    },

    "atualizar_talhao": {
        "action_type": "atualizar_talhao",
        "module": "fazendas",
        "model_target": "Talhao",
        "description": "Atualiza dados de um talhão existente (nome, área, custo)",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "description": "Nome atual do talhão a ser atualizado (usado para identificá-lo)",
                    "example": "Talhão A1",
                },
            ],
            "optional": [
                {
                    "name": "novo_nome",
                    "type": "str",
                    "description": "Novo nome para o talhão (se quiser renomear)",
                    "example": "Talhão A1-Novo",
                },
                {
                    "name": "area_hectares",
                    "type": "Decimal",
                    "description": "Nova área em hectares",
                    "example": 200.0,
                    "note": "Aceita também como 'area_size' ou 'area_ha' (mapeamento automático)",
                },
                {
                    "name": "custo_arrendamento",
                    "type": "Decimal",
                    "description": "Novo custo de arrendamento em sacas/hectare",
                    "example": 15.0,
                },
            ],
        },
        "related_lookups": [
            "nome (str) → Talhao.name (iexact, fallback icontains, filtrado por tenant)",
        ],
        "validation_notes": [
            "Pelo menos um campo opcional (novo_nome, area_hectares, custo_arrendamento) deve ser informado",
            "Se o talhão não for encontrado pelo nome, o executor lança erro",
        ],
    },

    "registrar_arrendamento": {
        "action_type": "registrar_arrendamento",
        "module": "fazendas",
        "model_target": "Arrendamento",
        "description": "Registra um contrato de arrendamento de áreas rurais entre dois proprietários",
        "fields": {
            "required": [
                {
                    "name": "arrendador",
                    "type": "str",
                    "description": "Nome do proprietário que CEDE/empresta a terra (dono original)",
                    "example": "João Carlos da Silva",
                },
                {
                    "name": "arrendatario",
                    "type": "str",
                    "description": "Nome do produtor rural que PAGA para usar a terra",
                    "example": "Pedro Almeida",
                },
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda onde estão as áreas arrendadas",
                    "example": "Fazenda São João",
                },
                {
                    "name": "custo_sacas_hectare",
                    "type": "Decimal",
                    "description": "Custo que o arrendatário paga em sacas de soja por hectare — deve ser > 0",
                    "example": 12.5,
                },
            ],
            "optional": [
                {
                    "name": "data_inicio",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data de início do arrendamento",
                    "example": "01/03/2026",
                    "default": "data atual",
                    "tool_param_name": "start_date",
                },
                {
                    "name": "data_fim",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data de fim do arrendamento (vazio = sem prazo definido)",
                    "example": "01/03/2027",
                    "default": None,
                    "tool_param_name": "end_date",
                },
                {
                    "name": "areas",
                    "type": "list[str] ou str separada por vírgula",
                    "description": "Nomes das áreas específicas da fazenda que estão sendo arrendadas",
                    "example": "Gleba Norte, Gleba Sul",
                    "default": [],
                },
            ],
        },
        "related_lookups": [
            "arrendador (str) → Proprietario.nome (icontains)",
            "arrendatario (str) → Proprietario.nome (icontains)",
            "fazenda (str) → Fazenda.name (icontains)",
            "areas (list[str]) → Area.name (icontains, filtrado pela fazenda)",
        ],
        "validation_notes": [
            "custo_sacas_hectare deve ser maior que zero",
            "arrendador e arrendatario devem ser proprietários já cadastrados",
            "a fazenda deve existir e pertencer ao tenant",
        ],
    },

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO AGRICULTURA
    # ═══════════════════════════════════════════════════════════════════════

    "criar_safra": {
        "action_type": "criar_safra",
        "module": "agricultura",
        "model_target": "Plantio",
        "description": "Cria uma nova safra (plantio) vinculando cultura, fazenda e talhões",
        "fields": {
            "required": [
                {
                    "name": "cultura",
                    "type": "str",
                    "description": "Nome da cultura agrícola — se não existir no sistema, será criada automaticamente",
                    "example": "Soja",
                    "note": "Aceita também como 'nome_cultura'",
                },
            ],
            "optional": [
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda onde a safra será plantada",
                    "example": "Fazenda São João",
                },
                {
                    "name": "data_plantio",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data de plantio",
                    "example": "15/10/2025",
                    "default": "data atual",
                },
                {
                    "name": "status",
                    "type": "str",
                    "description": "Status inicial da safra",
                    "default": "em_andamento",
                    "choices": [
                        ("planejado", "Planejado"),
                        ("em_andamento", "Em Andamento"),
                        ("colhido", "Colhido"),
                        ("perdido", "Perdido"),
                    ],
                    "example": "em_andamento",
                },
                {
                    "name": "talhoes",
                    "type": "list[str] ou str separada por vírgula",
                    "description": "Nomes dos talhões a vincular à safra",
                    "example": "Talhão A1, Talhão B2",
                    "default": [],
                },
                {
                    "name": "variedade",
                    "type": "str",
                    "description": "Variedade da cultura cultivada nos talhões",
                    "example": "M6210",
                    "default": "",
                },
                {
                    "name": "quantidade_sementes",
                    "type": "Decimal",
                    "description": "Quantidade de sementes utilizada",
                    "example": 500.0,
                    "default": None,
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais sobre a safra",
                    "example": "Plantio direto sobre palhada de milho",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "cultura (str) → Cultura.nome (iexact, fallback icontains) — cria se não existir",
            "fazenda (str) → Fazenda.name (icontains)",
            "talhoes (list[str]) → Talhao.name (iexact/icontains, filtrado por tenant)",
        ],
        "validation_notes": [
            "cultura é obrigatória — se não existir, será criada automaticamente com nome.title()",
            "status inválido é corrigido para 'em_andamento'",
        ],
    },

    "operacao_agricola": {
        "action_type": "operacao_agricola",
        "module": "agricultura",
        "model_target": "Operacao",
        "description": "Registra uma operação agrícola (pulverização, adubação, plantio, dessecação, etc.)",
        "fields": {
            "required": [],
            "optional": [
                {
                    "name": "safra",
                    "type": "str",
                    "description": "Nome da safra ativa (ex: 'Soja', 'Safra Soja')",
                    "example": "Soja",
                    "note": "Recomendado — se não informado, 'fazenda' se torna obrigatória",
                },
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda — herda da safra se não informada",
                    "example": "Fazenda São João",
                },
                {
                    "name": "tipo_operacao",
                    "type": "str",
                    "description": "Tipo da operação agrícola",
                    "default": "prep_limpeza",
                    "note": "Aceita também como 'tipo'. Aceita nomes amigáveis (mapeados internamente)",
                    "choices": [
                        # Preparação do Solo
                        ("prep_limpeza", "Limpeza de Área"),
                        ("prep_aracao", "Aração"),
                        ("prep_gradagem", "Gradagem"),
                        ("prep_subsolagem", "Subsolagem"),
                        ("prep_correcao", "Correção do Solo"),
                        # Adubação
                        ("adub_base", "Adubação de Base"),
                        ("adub_cobertura", "Adubação de Cobertura"),
                        ("adub_foliar", "Adubação Foliar"),
                        # Plantio
                        ("plant_dessecacao", "Dessecação"),
                        ("plant_direto", "Plantio Direto"),
                        ("plant_convencional", "Plantio Convencional"),
                        # Tratos Culturais
                        ("trato_irrigacao", "Irrigação"),
                        ("trato_poda", "Poda"),
                        ("trato_desbaste", "Desbaste"),
                        ("trato_amontoa", "Amontoa"),
                        # Pulverização
                        ("pulv_herbicida", "Aplicação de Herbicida"),
                        ("pulv_fungicida", "Aplicação de Fungicida"),
                        ("pulv_inseticida", "Aplicação de Inseticida"),
                        ("pulv_pragas", "Controle de Pragas"),
                        ("pulv_doencas", "Controle de Doenças"),
                        ("pulv_daninhas", "Controle de Plantas Daninhas"),
                        # Operações Mecânicas
                        ("mec_rocada", "Roçada"),
                        ("mec_cultivo", "Cultivo Mecânico"),
                    ],
                    "friendly_aliases": {
                        "aracao": "prep_aracao",
                        "gradagem": "prep_gradagem",
                        "subsolagem": "prep_subsolagem",
                        "correcao": "prep_correcao",
                        "limpeza": "prep_limpeza",
                        "adubacao_base": "adub_base",
                        "adubacao_cobertura": "adub_cobertura",
                        "adubacao_foliar": "adub_foliar",
                        "dessecacao": "plant_dessecacao",
                        "plantio_direto": "plant_direto",
                        "plantio_convencional": "plant_convencional",
                        "irrigacao": "trato_irrigacao",
                        "poda": "trato_poda",
                        "desbaste": "trato_desbaste",
                        "amontoa": "trato_amontoa",
                        "herbicida": "pulv_herbicida",
                        "fungicida": "pulv_fungicida",
                        "inseticida": "pulv_inseticida",
                        "pulverizacao": "pulv_herbicida",
                        "rocada": "mec_rocada",
                        "cultivo_mecanico": "mec_cultivo",
                    },
                    "example": "pulv_herbicida",
                },
                {
                    "name": "data",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data da operação",
                    "example": "15/01/2026",
                    "default": "data atual",
                    "tool_param_name": "data_operacao",
                },
                {
                    "name": "talhao",
                    "type": "str",
                    "description": "Nome do talhão onde a operação foi realizada (campo único)",
                    "example": "Talhão A1",
                },
                {
                    "name": "talhoes",
                    "type": "list[str] ou str separada por vírgula",
                    "description": "Lista de talhões (quando múltiplos)",
                    "example": "Talhão A1, Talhão B2",
                    "default": [],
                },
                {
                    "name": "data_inicio",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data/hora de início da operação",
                    "example": "15/01/2026",
                },
                {
                    "name": "data_fim",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data/hora de término da operação (opcional)",
                    "example": "15/01/2026",
                    "default": "",
                },
                {
                    "name": "trator",
                    "type": "str",
                    "description": "Nome do trator/equipamento autopropelido",
                    "example": "John Deere 7820",
                    "note": "Use consultar_maquinas para verificar nomes disponíveis",
                    "default": "",
                },
                {
                    "name": "implemento",
                    "type": "str",
                    "description": "Nome do implemento/reboque associado",
                    "example": "Plantadeira John Deere",
                    "note": "Use consultar_maquinas para verificar nomes disponíveis",
                    "default": "",
                },
                {
                    "name": "custo_mao_obra",
                    "type": "Decimal",
                    "description": "Custo com mão de obra em reais",
                    "example": 500.00,
                    "default": 0,
                },
                {
                    "name": "custo_maquina",
                    "type": "Decimal",
                    "description": "Custo com máquinas/combustível em reais",
                    "example": 1200.00,
                    "default": 0,
                },
                {
                    "name": "custo_insumos",
                    "type": "Decimal",
                    "description": "Custo com insumos/produtos em reais",
                    "example": 3500.00,
                    "default": 0,
                },
                {
                    "name": "status",
                    "type": "str",
                    "description": "Status da operação",
                    "default": "concluida",
                    "choices": [
                        ("planejada", "Planejada"),
                        ("em_andamento", "Em Andamento"),
                        ("concluida", "Concluída"),
                        ("cancelada", "Cancelada"),
                    ],
                    "example": "concluida",
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais",
                    "example": "Aplicado com pulverizador autopropelido",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "safra (str) → Plantio via cultura.nome (iexact/icontains, prioriza status='em_andamento')",
            "fazenda (str) → Fazenda.name (icontains) — ou herdada do plantio",
            "talhao/talhoes (str) → Talhao.name (iexact/icontains)",
        ],
        "validation_notes": [
            "Se nem safra nem fazenda forem informadas, a validação do model Operacao falha",
            "A categoria é derivada automaticamente do prefixo do tipo (prep→preparacao, pulv→pulverizacao, etc.)",
            "custo_total é calculado automaticamente: custo_mao_obra + custo_maquina + custo_insumos",
        ],
    },

    "colheita": {
        "action_type": "colheita",
        "module": "agricultura",
        "model_target": "Colheita + MovimentacaoCarga (opcional)",
        "description": "Registra colheita de uma safra, opcionalmente com dados de transporte/carga",
        "fields": {
            "required": [
                {
                    "name": "safra",
                    "type": "str",
                    "description": "Nome da safra ativa (ex: 'Soja', 'Safra Soja')",
                    "example": "Soja",
                },
            ],
            "optional": [
                {
                    "name": "talhao",
                    "type": "str",
                    "description": "Nome do talhão colhido (dentro da safra)",
                    "example": "Talhão A1",
                },
                {
                    "name": "data_colheita",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data da colheita",
                    "example": "20/02/2026",
                    "default": "data atual",
                },
                {
                    "name": "producao_total",
                    "type": "Decimal",
                    "description": "Total colhido na unidade escolhida",
                    "example": 350.0,
                    "default": 0,
                },
                {
                    "name": "unidade",
                    "type": "str",
                    "description": "Unidade de produção",
                    "default": "sc",
                    "accepted_values": {
                        "sc": ["sc", "saca", "sacas"],
                        "kg": ["kg"],
                        "t": ["t", "ton", "tonelada", "toneladas"],
                    },
                    "example": "sc",
                },
                {
                    "name": "qualidade",
                    "type": "str",
                    "description": "Qualidade do grão",
                    "example": "Boa",
                    "default": "",
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais",
                    "example": "Colheita realizada sem chuva",
                    "default": "",
                },
                # ── Custos da colheita ──
                {
                    "name": "custo_mao_obra",
                    "type": "Decimal",
                    "description": "Custo de mão de obra da colheita em reais",
                    "example": 800.00,
                    "default": 0,
                },
                {
                    "name": "custo_maquina",
                    "type": "Decimal",
                    "description": "Custo da máquina/colheitadeira em reais",
                    "example": 2500.00,
                    "default": 0,
                },
                {
                    "name": "custo_combustivel",
                    "type": "Decimal",
                    "description": "Custo de combustível em reais",
                    "example": 1200.00,
                    "default": 0,
                },
                # ── Transporte (gera MovimentacaoCarga se placa ou peso_bruto informados) ──
                {
                    "name": "placa",
                    "type": "str",
                    "description": "Placa do veículo de transporte — se informada, cria MovimentacaoCarga",
                    "example": "ABC1D23",
                    "default": "",
                },
                {
                    "name": "motorista",
                    "type": "str",
                    "description": "Nome do motorista do caminhão",
                    "example": "Carlos Ferreira",
                    "default": "",
                },
                {
                    "name": "tara",
                    "type": "Decimal",
                    "description": "Peso do veículo vazio (tara) em kg",
                    "example": 15000.0,
                    "default": 0,
                },
                {
                    "name": "peso_bruto",
                    "type": "Decimal",
                    "description": "Peso bruto do caminhão carregado em kg — se informado, cria MovimentacaoCarga",
                    "example": 42000.0,
                    "default": 0,
                },
                {
                    "name": "descontos",
                    "type": "Decimal",
                    "description": "Descontos sobre o peso em kg (umidade, impurezas, etc.)",
                    "example": 500.0,
                    "default": 0,
                },
                {
                    "name": "custo_transporte",
                    "type": "Decimal",
                    "description": "Custo do frete em reais",
                    "example": 1500.00,
                    "default": 0,
                },
                {
                    "name": "destino_tipo",
                    "type": "str",
                    "description": "Tipo do destino da carga",
                    "default": "armazenagem_interna",
                    "choices": [
                        ("armazenagem_interna", "Armazenagem na Propriedade"),
                        ("armazenagem_externa", "Armazenagem Externa"),
                        ("venda_direta", "Venda Direta"),
                    ],
                    "example": "armazenagem_interna",
                },
                {
                    "name": "local_destino",
                    "type": "str",
                    "description": "Nome do local de armazenamento (quando destino_tipo='armazenagem_interna')",
                    "example": "Silo Central",
                    "default": "",
                },
                {
                    "name": "empresa_destino",
                    "type": "str",
                    "description": "Nome da empresa destino (quando destino_tipo='armazenagem_externa' ou 'venda_direta')",
                    "example": "Cargill Primavera",
                    "default": "",
                },
                {
                    "name": "nf_provisoria",
                    "type": "str",
                    "description": "Número da nota fiscal provisória",
                    "example": "NF-2026-001",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "safra (str) → Plantio via cultura.nome (iexact/icontains, prioriza status='em_andamento')",
            "talhao (str) → Talhao.name (iexact/icontains, prioriza dentro do plantio)",
            "local_destino (str) → LocalArmazenamento.nome (icontains)",
            "empresa_destino (str) → Empresa.nome (icontains)",
        ],
        "validation_notes": [
            "safra é obrigatória — o plantio deve existir no sistema",
            "Se placa ou peso_bruto forem informados, cria automaticamente um registro de MovimentacaoCarga",
            "A colheita é criada como is_estimada=True por padrão",
            "peso_liquido = peso_bruto - tara - descontos (calculado automaticamente)",
            "DICA: use consultar_safras_ativas antes para listar safras disponíveis",
        ],
    },

    "movimentacao_carga": {
        "action_type": "movimentacao_carga",
        "module": "agricultura",
        "model_target": "MovimentacaoCarga",
        "description": "Registra uma movimentação de carga (caminhão carregado) durante a colheita",
        "fields": {
            "required": [
                {
                    "name": "peso_bruto",
                    "type": "Decimal",
                    "description": "Peso bruto do caminhão carregado em kg",
                    "example": 42000.0,
                },
                {
                    "name": "tara",
                    "type": "Decimal",
                    "description": "Peso do caminhão vazio (tara) em kg",
                    "example": 15000.0,
                },
            ],
            "optional": [
                {
                    "name": "safra",
                    "type": "str",
                    "description": "Nome da safra ativa (para vincular à sessão de colheita)",
                    "example": "Soja",
                    "note": "Fortemente recomendado — necessário para vincular ao HarvestSession",
                },
                {
                    "name": "talhao",
                    "type": "str",
                    "description": "Nome do talhão de onde saiu a carga",
                    "example": "Talhão A1",
                },
                {
                    "name": "placa",
                    "type": "str",
                    "description": "Placa do veículo de transporte",
                    "example": "ABC1D23",
                    "default": "",
                },
                {
                    "name": "motorista",
                    "type": "str",
                    "description": "Nome do motorista do caminhão",
                    "example": "Carlos Ferreira",
                    "default": "",
                },
                {
                    "name": "descontos",
                    "type": "Decimal",
                    "description": "Descontos sobre o peso em kg",
                    "example": 500.0,
                    "default": 0,
                },
                {
                    "name": "custo_transporte",
                    "type": "Decimal",
                    "description": "Custo do frete em reais",
                    "example": 1500.00,
                    "default": 0,
                },
                {
                    "name": "destino_tipo",
                    "type": "str",
                    "description": "Tipo do destino da carga",
                    "default": "armazenagem_interna",
                    "choices": [
                        ("armazenagem_interna", "Armazenagem na Propriedade"),
                        ("armazenagem_externa", "Armazenagem Externa"),
                        ("venda_direta", "Venda Direta"),
                    ],
                    "example": "armazenagem_interna",
                },
                {
                    "name": "local_destino",
                    "type": "str",
                    "description": "Nome do local de armazenamento interno",
                    "example": "Silo Central",
                    "default": "",
                },
                {
                    "name": "empresa_destino",
                    "type": "str",
                    "description": "Nome da empresa destino (armazenagem externa ou venda direta)",
                    "example": "Cargill Primavera",
                    "default": "",
                },
                {
                    "name": "contrato_ref",
                    "type": "str",
                    "description": "Referência de contrato ou NF provisória",
                    "example": "NF-2026-001",
                    "default": "",
                    "note": "Aceita também 'nf_provisoria'",
                },
                {
                    "name": "condicoes_graos",
                    "type": "str",
                    "description": "Condições dos grãos (ex: Boa, Avariado, Úmido)",
                    "example": "Boa",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "safra (str) → Plantio via cultura.nome (iexact/icontains)",
            "talhao (str) → Talhao.name (iexact/icontains)",
            "local_destino (str) → LocalArmazenamento.nome (icontains)",
            "empresa_destino (str) → Empresa.nome (icontains)",
        ],
        "validation_notes": [
            "peso_liquido = peso_bruto - tara - descontos (calculado automaticamente no save())",
            "Se a safra tiver uma HarvestSession ativa, a carga é vinculada ao session_item",
            "DICA: use consultar_sessoes_colheita_ativas antes para verificar sessão ativa",
        ],
    },

    "registrar_manejo": {
        "action_type": "registrar_manejo",
        "module": "agricultura",
        "model_target": "Manejo",
        "description": "Registra uma atividade de manejo agrícola (preparo de solo, irrigação, controle de pragas, etc.)",
        "fields": {
            "required": [
                {
                    "name": "tipo",
                    "type": "str",
                    "description": "Tipo de manejo agrícola",
                    "note": "Aceita também 'tipo_manejo'. Valores inválidos são convertidos para 'outro'",
                    "choices": [
                        # Preparação do Solo
                        ("preparo_solo", "Preparo do Solo"),
                        ("aracao", "Aração"),
                        ("gradagem", "Gradagem"),
                        ("subsolagem", "Subsolagem"),
                        ("correcao_solo", "Correção do Solo"),
                        ("calagem", "Calagem"),
                        # Adubação
                        ("adubacao_base", "Adubação de Base"),
                        ("adubacao_cobertura", "Adubação de Cobertura"),
                        ("adubacao_foliar", "Adubação Foliar"),
                        # Plantio
                        ("dessecacao", "Dessecação"),
                        ("plantio_direto", "Plantio Direto"),
                        ("plantio_convencional", "Plantio Convencional"),
                        # Tratos Culturais
                        ("irrigacao", "Irrigação"),
                        ("poda", "Poda"),
                        ("desbaste", "Desbaste"),
                        ("amontoa", "Amontoa"),
                        # Controle Fitossanitário
                        ("controle_pragas", "Controle de Pragas"),
                        ("controle_doencas", "Controle de Doenças"),
                        ("controle_plantas_daninhas", "Controle de Plantas Daninhas"),
                        ("pulverizacao", "Pulverização"),
                        ("aplicacao_herbicida", "Aplicação de Herbicida"),
                        ("aplicacao_fungicida", "Aplicação de Fungicida"),
                        ("aplicacao_inseticida", "Aplicação de Inseticida"),
                        # Operações Mecânicas
                        ("capina", "Capina"),
                        ("rocada", "Roçada"),
                        ("cultivo_mecanico", "Cultivo Mecânico"),
                        # Outros
                        ("outro", "Outro"),
                    ],
                    "default": "outro",
                    "example": "pulverizacao",
                },
                {
                    "name": "data",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data do manejo",
                    "example": "10/01/2026",
                    "default": "data atual",
                    "tool_param_name": "data_manejo",
                },
            ],
            "optional": [
                {
                    "name": "safra",
                    "type": "str",
                    "description": "Nome da safra ativa (permite manejo pré-plantio se não informado)",
                    "example": "Soja",
                },
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda — herda da safra se não informada",
                    "example": "Fazenda São João",
                },
                {
                    "name": "descricao",
                    "type": "str",
                    "description": "Descrição detalhada do que foi realizado",
                    "example": "Aplicação de herbicida glifosato para dessecação pré-plantio",
                    "default": "",
                },
                {
                    "name": "talhao",
                    "type": "str",
                    "description": "Nome do talhão onde o manejo foi realizado",
                    "example": "Talhão A1",
                },
                {
                    "name": "equipamento",
                    "type": "str",
                    "description": "Nome do equipamento/máquina utilizado (texto livre)",
                    "example": "Pulverizador Jacto Uniport 3030",
                    "default": "",
                },
                {
                    "name": "custo",
                    "type": "Decimal",
                    "description": "Custo geral do manejo em reais",
                    "example": 5000.00,
                    "default": 0,
                },
                {
                    "name": "custo_mao_obra",
                    "type": "Decimal",
                    "description": "Custo de mão de obra em reais",
                    "example": 500.00,
                    "default": 0,
                },
                {
                    "name": "custo_maquinas",
                    "type": "Decimal",
                    "description": "Custo de máquinas em reais",
                    "example": 1200.00,
                    "default": 0,
                },
                {
                    "name": "custo_insumos",
                    "type": "Decimal",
                    "description": "Custo de insumos em reais",
                    "example": 3500.00,
                    "default": 0,
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais",
                    "example": "Aplicação realizada pela manhã com temperatura de 28°C",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "safra (str) → Plantio via cultura.nome (iexact/icontains)",
            "fazenda (str) → Fazenda.name (icontains)",
            "talhao (str) → Talhao.name (iexact/icontains, prioriza dentro do plantio)",
        ],
        "validation_notes": [
            "tipo inválido é convertido para 'outro'",
            "custo_total = custo_mao_obra + custo_maquinas + custo_insumos + custo_outros + custo (calculado no save())",
            "plantio é opcional — permite registrar manejos pré-plantio",
        ],
    },

    "ordem_servico_agricola": {
        "action_type": "ordem_servico_agricola",
        "module": "agricultura",
        "model_target": "OrdemServico (agricultura)",
        "description": "Cria uma ordem de serviço agrícola (programação de trabalho no campo)",
        "fields": {
            "required": [
                {
                    "name": "tarefa",
                    "type": "str",
                    "max_length": 200,
                    "description": "Descrição da tarefa a ser executada",
                    "example": "Pulverização de herbicida no Talhão A1",
                    "note": "Se vazio, usa 'descricao' como fallback",
                },
            ],
            "optional": [
                {
                    "name": "fazenda",
                    "type": "str",
                    "description": "Nome da fazenda onde a OS será executada",
                    "example": "Fazenda São João",
                },
                {
                    "name": "data_inicio",
                    "type": "datetime (str DD/MM/AAAA HH:MM ou AAAA-MM-DD)",
                    "description": "Data/hora de início da execução",
                    "example": "15/01/2026 08:00",
                    "default": "data/hora atual",
                    "note": "Aceita também 'data'",
                },
                {
                    "name": "maquina",
                    "type": "str",
                    "description": "Nome do equipamento/máquina a ser utilizado (texto livre)",
                    "example": "Trator John Deere 7200J",
                    "default": "",
                },
                {
                    "name": "insumos",
                    "type": "list[dict]",
                    "description": "Lista de insumos necessários (estrutura JSON)",
                    "example": [{"produto_id": 1, "quantidade": 50}],
                    "default": [],
                },
                {
                    "name": "status",
                    "type": "str",
                    "description": "Status da OS",
                    "default": "pendente",
                    "choices": [
                        ("pendente", "Pendente"),
                        ("aprovada", "Aprovada"),
                        ("ativa", "Ativa"),
                        ("finalizada", "Finalizada"),
                    ],
                    "example": "pendente",
                },
                {
                    "name": "custo_total",
                    "type": "Decimal",
                    "description": "Custo total previsto em reais",
                    "example": 5000.00,
                    "default": 0,
                },
                {
                    "name": "talhao",
                    "type": "str",
                    "description": "Nome do talhão onde a OS será executada",
                    "example": "Talhão A1",
                },
            ],
        },
        "related_lookups": [
            "fazenda (str) → Fazenda.name (icontains)",
            "talhao (str) → Talhao.name (iexact/icontains)",
        ],
        "validation_notes": [
            "tarefa é obrigatória — se vazia, cai para 'descricao' e depois para texto padrão",
            "talhoes são vinculados via M2M após criação da OS",
        ],
    },

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO ESTOQUE
    # ═══════════════════════════════════════════════════════════════════════

    "criar_produto": {
        "action_type": "criar_produto",
        "module": "estoque",
        "model_target": "Produto",
        "description": "Cadastra um novo produto no estoque do sistema agropecuário",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": "Nome completo do produto",
                    "example": "Glifosato Roundup Original 360g/L",
                    "note": "Aceita também 'nome_produto'. Se já existir (iexact), retorna o existente",
                },
            ],
            "optional": [
                {
                    "name": "codigo",
                    "type": "str",
                    "max_length": 50,
                    "description": "Código interno do produto — gerado automaticamente se não informado (PROD-0001)",
                    "example": "HERB-001",
                    "default": "auto-gerado",
                },
                {
                    "name": "unidade",
                    "type": "str",
                    "max_length": 20,
                    "description": "Unidade de medida do produto",
                    "example": "L",
                    "default": "un",
                },
                {
                    "name": "categoria",
                    "type": "str",
                    "description": "Categoria do produto",
                    "default": "outro",
                    "choices": [
                        ("semente", "Semente"),
                        ("fertilizante", "Fertilizante"),
                        ("corretivo", "Corretivo"),
                        ("herbicida", "Herbicida"),
                        ("fungicida", "Fungicida"),
                        ("inseticida", "Inseticida"),
                        ("acaricida", "Acaricida"),
                        ("adjuvante", "Adjuvante"),
                        ("combustiveis_lubrificantes", "Combustíveis e Lubrificantes"),
                        ("pecas_manutencao", "Peças de manutenção"),
                        ("construcao", "Construção"),
                        ("correcao_solo", "Correção de solo"),
                        ("outro", "Outro"),
                    ],
                    "example": "herbicida",
                },
                {
                    "name": "descricao",
                    "type": "str",
                    "description": "Descrição do produto",
                    "example": "Herbicida sistêmico não seletivo",
                    "default": "",
                },
                {
                    "name": "principio_ativo",
                    "type": "str",
                    "max_length": 200,
                    "description": "Ingrediente ativo do produto (obrigatório para defensivos)",
                    "example": "Glifosato",
                    "default": "",
                },
                {
                    "name": "quantidade_inicial",
                    "type": "Decimal",
                    "description": "Quantidade inicial em estoque",
                    "example": 100.0,
                    "default": 0,
                    "note": "Aceita também 'quantidade_estoque'",
                },
                {
                    "name": "estoque_minimo",
                    "type": "Decimal",
                    "description": "Estoque mínimo para alerta de reposição",
                    "example": 10.0,
                    "default": 0,
                },
                {
                    "name": "custo_unitario",
                    "type": "Decimal",
                    "description": "Custo de compra por unidade em reais",
                    "example": 45.50,
                    "default": None,
                    "note": "Aceita também 'valor_unitario'",
                },
                {
                    "name": "preco_venda",
                    "type": "Decimal",
                    "description": "Preço de venda por unidade em reais",
                    "example": 55.00,
                    "default": None,
                },
                {
                    "name": "local_armazenamento",
                    "type": "str",
                    "description": "Nome do local de armazenamento",
                    "example": "Galpão de Insumos",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "local_armazenamento (str) → LocalArmazenamento.nome (icontains)",
        ],
        "validation_notes": [
            "Se produto com mesmo nome (iexact) já existir, retorna o existente sem criar duplicata",
            "codigo é auto-gerado (PROD-XXXX) se não informado",
            "categoria inválida é convertida para 'outro'",
        ],
    },

    "criar_item_estoque": {
        "action_type": "criar_item_estoque",
        "module": "estoque",
        "model_target": "Produto",
        "description": "Alias para criar_produto — cria um novo item/produto no estoque (mesmo executor)",
        "fields": "MESMO QUE criar_produto",
        "note": "Este action_type usa exatamente o mesmo executor de criar_produto (execute_criar_item_estoque = execute_criar_produto)",
    },

    "entrada_estoque": {
        "action_type": "entrada_estoque",
        "module": "estoque",
        "model_target": "MovimentacaoEstoque (tipo='entrada')",
        "description": "Registra entrada de produto no estoque (compra, recebimento, devolução)",
        "fields": {
            "required": [
                {
                    "name": "nome_produto",
                    "type": "str",
                    "description": "Nome do produto (deve existir no cadastro)",
                    "example": "Glifosato Roundup Original",
                    "note": "Aceita também 'produto'",
                },
                {
                    "name": "quantidade",
                    "type": "Decimal",
                    "description": "Quantidade recebida — deve ser > 0",
                    "example": 50.0,
                },
            ],
            "optional": [
                {
                    "name": "valor_unitario",
                    "type": "Decimal",
                    "description": "Custo unitário em reais",
                    "example": 45.50,
                    "default": None,
                    "note": "Aceita também 'custo_unitario'",
                },
                {
                    "name": "data",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data do recebimento",
                    "example": "10/01/2026",
                    "default": "data atual",
                },
                {
                    "name": "numero_nf",
                    "type": "str",
                    "description": "Número da nota fiscal",
                    "example": "NF-2026-045",
                    "default": "",
                    "note": "Aceita também 'documento_referencia'",
                },
                {
                    "name": "motivo",
                    "type": "str",
                    "description": "Motivo da entrada",
                    "example": "Compra de insumos para safra 2026",
                    "default": "Entrada registrada pelo assistente Isidoro.",
                },
            ],
        },
        "related_lookups": [
            "nome_produto (str) → Produto.nome (iexact, fallback icontains)",
        ],
        "validation_notes": [
            "O produto deve existir previamente no cadastro",
            "quantidade deve ser > 0",
            "A movimentação usa origem='acao_isidoro' e tipo='entrada'",
            "valor_total = valor_unitario × quantidade (calculado automaticamente)",
        ],
    },

    "saida_estoque": {
        "action_type": "saida_estoque",
        "module": "estoque",
        "model_target": "MovimentacaoEstoque (tipo='saida')",
        "description": "Registra saída de produto do estoque (uso em campo, venda, descarte)",
        "fields": {
            "required": [
                {
                    "name": "nome_produto",
                    "type": "str",
                    "description": "Nome do produto (deve existir no cadastro)",
                    "example": "Glifosato Roundup Original",
                    "note": "Aceita também 'produto'",
                },
                {
                    "name": "quantidade",
                    "type": "Decimal",
                    "description": "Quantidade saindo — deve ser > 0",
                    "example": 20.0,
                },
            ],
            "optional": [
                {
                    "name": "valor_unitario",
                    "type": "Decimal",
                    "description": "Custo unitário em reais",
                    "example": 45.50,
                    "default": None,
                    "note": "Aceita também 'custo_unitario'",
                },
                {
                    "name": "documento_referencia",
                    "type": "str",
                    "description": "Número do documento de referência (NF, OS, etc.)",
                    "example": "OS-2026-012",
                    "default": "",
                },
                {
                    "name": "motivo",
                    "type": "str",
                    "description": "Motivo da saída",
                    "example": "Aplicação no Talhão A1 - Safra Soja",
                    "default": "Saída registrada pelo assistente Isidoro.",
                },
            ],
        },
        "related_lookups": [
            "nome_produto (str) → Produto.nome (iexact, fallback icontains)",
        ],
        "validation_notes": [
            "O produto deve existir previamente no cadastro",
            "quantidade deve ser > 0",
            "ATENÇÃO: não há validação de estoque insuficiente no executor — o saldo pode ficar negativo",
        ],
    },

    "ajuste_estoque": {
        "action_type": "ajuste_estoque",
        "module": "estoque",
        "model_target": "MovimentacaoEstoque (tipo='entrada' ou 'saida' conforme sinal)",
        "description": "Registra ajuste de inventário (positivo = entrada, negativo = saída)",
        "fields": {
            "required": [
                {
                    "name": "nome_produto",
                    "type": "str",
                    "description": "Nome do produto (deve existir no cadastro)",
                    "example": "Diesel S500",
                    "note": "Aceita também 'produto'",
                },
                {
                    "name": "quantidade",
                    "type": "Decimal",
                    "description": "Quantidade do ajuste — positivo=entrada, negativo=saída. NÃO pode ser zero",
                    "example": -15.0,
                },
            ],
            "optional": [
                {
                    "name": "motivo",
                    "type": "str",
                    "description": "Motivo do ajuste de inventário",
                    "example": "Correção de contagem física",
                    "default": "Ajuste de inventário via assistente Isidoro.",
                },
                {
                    "name": "documento_referencia",
                    "type": "str",
                    "description": "Documento de referência do ajuste",
                    "example": "INV-2026-001",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "nome_produto (str) → Produto.nome (iexact, fallback icontains)",
        ],
        "validation_notes": [
            "quantidade positiva gera movimentação tipo='entrada'",
            "quantidade negativa gera movimentação tipo='saida' (usado abs())",
            "quantidade ZERO lança ValueError",
            "origem é marcada como 'ajuste_inventario'",
        ],
    },

    "movimentacao_interna": {
        "action_type": "movimentacao_interna",
        "module": "estoque",
        "model_target": "MovimentacaoEstoque (2 registros: saida + entrada)",
        "description": "Registra transferência interna de produto entre locais de armazenamento",
        "fields": {
            "required": [
                {
                    "name": "nome_produto",
                    "type": "str",
                    "description": "Nome do produto a ser transferido (deve existir no cadastro)",
                    "example": "Diesel S500",
                    "note": "Aceita também 'produto'",
                },
                {
                    "name": "quantidade",
                    "type": "Decimal",
                    "description": "Quantidade a transferir — deve ser > 0",
                    "example": 500.0,
                },
            ],
            "optional": [
                {
                    "name": "local_origem",
                    "type": "str",
                    "description": "Nome do local de origem (de onde sai o produto)",
                    "example": "Galpão Central",
                    "default": "",
                    "tool_param_name": "localizacao_origem",
                },
                {
                    "name": "local_destino",
                    "type": "str",
                    "description": "Nome do local de destino (para onde vai o produto)",
                    "example": "Silo B",
                    "default": "",
                    "tool_param_name": "localizacao_destino",
                },
                {
                    "name": "motivo",
                    "type": "str",
                    "description": "Motivo da transferência",
                    "example": "Reposição do estoque do campo",
                    "default": "Transferência interna via assistente Isidoro.",
                },
            ],
        },
        "related_lookups": [
            "nome_produto (str) → Produto.nome (iexact, fallback icontains)",
            "local_destino (str) → LocalArmazenamento.nome (icontains)",
        ],
        "validation_notes": [
            "Gera DUAS movimentações: uma saída na origem e uma entrada no destino",
            "quantidade deve ser > 0",
            "origem é marcada como 'transferencia_interna'",
        ],
    },

    # ═══════════════════════════════════════════════════════════════════════
    # MÓDULO MÁQUINAS
    # ═══════════════════════════════════════════════════════════════════════

    "criar_equipamento": {
        "action_type": "criar_equipamento",
        "module": "maquinas",
        "model_target": "Equipamento",
        "description": "Cadastra um novo equipamento/máquina agrícola no sistema",
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": "Nome completo do equipamento",
                    "example": "Trator John Deere 7200J",
                },
                {
                    "name": "ano_fabricacao",
                    "type": "int",
                    "description": "Ano de fabricação (>= 1900, não pode ser futuro)",
                    "example": 2022,
                },
                {
                    "name": "valor_aquisicao",
                    "type": "Decimal",
                    "description": "Valor de aquisição em reais (>= 0)",
                    "example": 850000.00,
                },
            ],
            "optional": [
                {
                    "name": "categoria",
                    "type": "str",
                    "description": "Nome da categoria do equipamento — busca ou cria automaticamente",
                    "example": "Trator",
                    "default": "Outros",
                    "note": "Não é uma choice fixa — CategoriaEquipamento é dinâmica. Exemplos comuns: Trator, Colhedeira, Plantadeira, Pulverizador, Implemento, Veículo",
                },
                {
                    "name": "marca",
                    "type": "str",
                    "max_length": 100,
                    "description": "Marca/fabricante do equipamento",
                    "example": "John Deere",
                    "default": "",
                },
                {
                    "name": "modelo",
                    "type": "str",
                    "max_length": 100,
                    "description": "Modelo específico do equipamento",
                    "example": "7200J",
                    "default": "",
                },
                {
                    "name": "numero_serie",
                    "type": "str",
                    "max_length": 100,
                    "description": "Número de série ou chassi",
                    "example": "1T07200JXPD123456",
                    "default": None,
                },
                {
                    "name": "potencia_cv",
                    "type": "Decimal",
                    "description": "Potência em cavalos (CV) — para tratores e autopropelidos",
                    "example": 200.0,
                    "default": None,
                },
                {
                    "name": "horimetro_atual",
                    "type": "Decimal",
                    "description": "Leitura atual do horímetro (horas trabalhadas)",
                    "example": 3500.5,
                    "default": None,
                },
                {
                    "name": "data_aquisicao",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data de aquisição (não pode ser futura)",
                    "example": "15/06/2022",
                    "default": None,
                },
                {
                    "name": "status",
                    "type": "str",
                    "description": "Status do equipamento",
                    "default": "ativo",
                    "choices": [
                        ("ativo", "Ativo"),
                        ("inativo", "Inativo"),
                        ("manutencao", "Manutenção"),
                        ("vendido", "Vendido"),
                    ],
                    "example": "ativo",
                },
                {
                    "name": "local_instalacao",
                    "type": "str",
                    "max_length": 200,
                    "description": "Local onde o equipamento está instalado/guardado",
                    "example": "Galpão de Máquinas - Fazenda São João",
                    "default": "",
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais sobre o equipamento",
                    "example": "Equipado com piloto automático e GPS",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "categoria (str) → CategoriaEquipamento.nome (iexact) — cria se não existir",
        ],
        "validation_notes": [
            "ano_fabricacao deve ser >= 1900 e não pode ser no futuro",
            "data_aquisicao não pode ser no futuro",
            "categoria é dinâmica (não é choice fixa) — se não existir, é criada como 'autopropelido'",
            "o executor chama full_clean() antes de salvar — validações do model são aplicadas",
            "NOTA: o executor usa 'capacidade_litros' mas o model tem 'capacidade_tanque' — campo pode não ser salvo corretamente",
        ],
    },

    "manutencao_maquina": {
        "action_type": "manutencao_maquina",
        "module": "maquinas",
        "model_target": "OrdemServico (maquinas)",
        "description": "Registra manutenção de um equipamento/máquina (cria Ordem de Serviço)",
        "fields": {
            "required": [
                {
                    "name": "maquina_nome",
                    "type": "str",
                    "description": "Nome ou modelo da máquina (busca por nome, modelo ou tokens)",
                    "example": "Colheitadeira NH CR5.85",
                    "note": "Aceita também 'equipamento'",
                },
            ],
            "optional": [
                {
                    "name": "tipo_registro",
                    "type": "str",
                    "description": "Tipo do registro de manutenção",
                    "default": "corretiva",
                    "note": "Aceita também 'tipo'. Mapeado internamente para tipo de OS",
                    "accepted_values_map": {
                        "manutencao": "corretiva",
                        "revisao": "preventiva",
                        "reparo": "corretiva",
                        "troca_oleo": "preventiva",
                        "preventiva": "preventiva",
                        "corretiva": "corretiva",
                        "emergencial": "emergencial",
                        "melhoria": "melhoria",
                    },
                    "example": "manutencao",
                },
                {
                    "name": "prioridade",
                    "type": "str",
                    "description": "Prioridade da manutenção",
                    "default": "media",
                    "choices": [
                        ("baixa", "Baixa"),
                        ("media", "Média"),
                        ("alta", "Alta"),
                        ("critica", "Crítica"),
                    ],
                    "example": "media",
                },
                {
                    "name": "descricao_problema",
                    "type": "str",
                    "description": "Descrição detalhada do problema ou serviço realizado",
                    "example": "Troca de filtro de óleo e filtro de ar",
                    "default": "auto-gerado a partir do tipo",
                    "note": "Aceita também 'descricao'",
                },
                {
                    "name": "custo_mao_obra",
                    "type": "Decimal",
                    "description": "Custo de mão de obra em reais",
                    "example": 500.00,
                    "default": 0,
                    "note": "Aceita também 'custo'",
                },
                {
                    "name": "data_previsao",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data prevista para conclusão",
                    "example": "20/01/2026",
                    "default": None,
                    "note": "Aceita também 'data'",
                },
                {
                    "name": "status",
                    "type": "str",
                    "description": "Status da OS",
                    "default": "concluida",
                    "choices": [
                        ("aberta", "Aberta"),
                        ("em_andamento", "Em Andamento"),
                        ("concluida", "Concluída"),
                        ("cancelada", "Cancelada"),
                    ],
                    "example": "concluida",
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais",
                    "example": "Peças originais utilizadas",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "maquina_nome (str) → Equipamento.nome/modelo (iexact, icontains, multi-token)",
        ],
        "validation_notes": [
            "O equipamento deve existir previamente no cadastro",
            "numero_os é gerado automaticamente no save() (OS + timestamp)",
            "custo_total = custo_mao_obra + custo_pecas (calculado no save())",
            "Este action_type usa o MESMO executor que ordem_servico_maquina",
        ],
    },

    "abastecimento": {
        "action_type": "abastecimento",
        "module": "maquinas",
        "model_target": "Abastecimento",
        "description": "Registra abastecimento de combustível em um equipamento/máquina",
        "fields": {
            "required": [
                {
                    "name": "maquina_nome",
                    "type": "str",
                    "description": "Nome ou modelo da máquina (busca por nome, modelo ou tokens)",
                    "example": "Colheitadeira NH CR5.85",
                },
                {
                    "name": "quantidade_litros",
                    "type": "Decimal",
                    "description": "Quantidade de combustível em litros (> 0)",
                    "example": 305.0,
                    "note": "Se não informado, tenta extrair da 'descricao' via regex (ex: '305 litros de Diesel')",
                },
                {
                    "name": "valor_unitario",
                    "type": "Decimal",
                    "description": "Preço por litro em reais (> 0)",
                    "example": 5.45,
                    "note": "Se não informado, tenta calcular: custo / quantidade_litros",
                },
            ],
            "optional": [
                {
                    "name": "data",
                    "type": "datetime (str DD/MM/AAAA HH:MM ou DD/MM/AAAA)",
                    "description": "Data/hora do abastecimento",
                    "example": "15/01/2026 14:30",
                    "default": "data/hora atual",
                },
                {
                    "name": "custo",
                    "type": "Decimal",
                    "description": "Custo total do abastecimento (alternativa ao valor_unitario)",
                    "example": 1662.25,
                    "note": "Usado para calcular valor_unitario quando não informado: custo / quantidade_litros",
                },
                {
                    "name": "horimetro",
                    "type": "Decimal",
                    "description": "Leitura do horímetro (horas do motor) no momento do abastecimento",
                    "example": 2196.37,
                    "default": None,
                    "note": "Aceita também 'horas_trabalhadas'",
                },
                {
                    "name": "local_abastecimento",
                    "type": "str",
                    "description": "Local onde foi realizado o abastecimento",
                    "example": "Posto da Fazenda",
                    "default": "",
                    "note": "Aceita também 'local'",
                },
                {
                    "name": "responsavel",
                    "type": "str",
                    "description": "Nome do responsável pelo abastecimento",
                    "example": "Carlos Ferreira",
                    "default": "",
                    "note": "Aceita também 'tecnico'",
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais (tipo combustível, NF, etc.)",
                    "example": "Diesel S500 - NF 12345",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "maquina_nome (str) → Equipamento.nome/modelo (iexact, icontains, multi-token)",
        ],
        "validation_notes": [
            "O equipamento deve existir previamente no cadastro",
            "quantidade_litros e valor_unitario devem ser > 0",
            "valor_total = quantidade_litros × valor_unitario (calculado automaticamente)",
            "Se valor_unitario não informado mas 'custo' sim: valor_unitario = custo / quantidade_litros",
        ],
    },

    "ordem_servico_maquina": {
        "action_type": "ordem_servico_maquina",
        "module": "maquinas",
        "model_target": "OrdemServico (maquinas)",
        "description": "Abre uma ordem de serviço de manutenção para um equipamento (mesmo executor que manutencao_maquina)",
        "fields": {
            "required": [
                {
                    "name": "equipamento",
                    "type": "str",
                    "description": "Nome do equipamento (busca por nome, modelo ou tokens)",
                    "example": "Trator John Deere 7200J",
                    "note": "Aceita também 'maquina_nome' — o executor suporta ambos",
                },
                {
                    "name": "descricao_problema",
                    "type": "str",
                    "description": "Descrição detalhada do problema ou serviço a realizar",
                    "example": "Vazamento de óleo hidráulico na bomba principal",
                    "note": "Aceita também 'descricao'",
                },
            ],
            "optional": [
                {
                    "name": "tipo",
                    "type": "str",
                    "description": "Tipo de manutenção/OS",
                    "default": "corretiva",
                    "note": "Aceita também 'tipo_registro'",
                    "choices": [
                        ("preventiva", "Preventiva"),
                        ("corretiva", "Corretiva"),
                        ("melhoria", "Melhoria"),
                        ("emergencial", "Emergencial"),
                    ],
                    "example": "corretiva",
                },
                {
                    "name": "prioridade",
                    "type": "str",
                    "description": "Prioridade da OS",
                    "default": "media",
                    "choices": [
                        ("baixa", "Baixa"),
                        ("media", "Média"),
                        ("alta", "Alta"),
                        ("critica", "Crítica"),
                    ],
                    "example": "alta",
                },
                {
                    "name": "status",
                    "type": "str",
                    "description": "Status da OS",
                    "default": "concluida",
                    "choices": [
                        ("aberta", "Aberta"),
                        ("em_andamento", "Em Andamento"),
                        ("concluida", "Concluída"),
                        ("cancelada", "Cancelada"),
                    ],
                    "example": "aberta",
                },
                {
                    "name": "custo_mao_obra",
                    "type": "Decimal",
                    "description": "Custo de mão de obra em reais",
                    "example": 800.00,
                    "default": 0,
                    "note": "Aceita também 'custo'",
                },
                {
                    "name": "data_previsao",
                    "type": "date (str DD/MM/AAAA ou AAAA-MM-DD)",
                    "description": "Data prevista para conclusão",
                    "example": "25/01/2026",
                    "default": None,
                    "note": "Aceita também 'data'",
                },
                {
                    "name": "observacoes",
                    "type": "str",
                    "description": "Observações adicionais (peças necessárias, erros, etc.)",
                    "example": "Orçar peça com fornecedor antes de executar",
                    "default": "",
                },
            ],
        },
        "related_lookups": [
            "equipamento (str) → Equipamento.nome/modelo (iexact, icontains, multi-token)",
        ],
        "validation_notes": [
            "O equipamento deve existir previamente no cadastro",
            "Usa o MESMO executor que manutencao_maquina (execute_ordem_servico)",
            "numero_os é gerado automaticamente no save() (OS + timestamp)",
            "custo_total = custo_mao_obra + custo_pecas (calculado no save())",
        ],
    },

    "parada_maquina": {
        "action_type": "parada_maquina",
        "module": "maquinas",
        "model_target": "Equipamento (atualização de status)",
        "description": "Registra parada de uma máquina (muda status do equipamento para 'manutencao')",
        "fields": {
            "required": [
                {
                    "name": "maquina_nome",
                    "type": "str",
                    "description": "Nome ou modelo da máquina a ser parada",
                    "example": "Trator John Deere 7200J",
                },
            ],
            "optional": [
                {
                    "name": "descricao",
                    "type": "str",
                    "description": "Motivo da parada",
                    "example": "Parada para manutenção preventiva programada",
                    "default": "Parada registrada pelo assistente Isidoro.",
                },
            ],
        },
        "related_lookups": [
            "maquina_nome (str) → Equipamento.nome/modelo (iexact, icontains, multi-token)",
        ],
        "validation_notes": [
            "O equipamento deve existir previamente no cadastro",
            "Altera o status do equipamento para 'manutencao'",
            "NÃO cria OrdemServico — apenas atualiza o status",
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════════
# ÍNDICE RÁPIDO — módulo → action_types
# ═══════════════════════════════════════════════════════════════════════

ACTION_TYPES_BY_MODULE = {
    "fazendas": [
        "criar_proprietario",
        "criar_fazenda",
        "criar_area",
        "criar_talhao",
        "atualizar_talhao",
        "registrar_arrendamento",
    ],
    "agricultura": [
        "criar_safra",
        "operacao_agricola",
        "colheita",
        "movimentacao_carga",
        "registrar_manejo",
        "ordem_servico_agricola",
    ],
    "estoque": [
        "criar_produto",
        "criar_item_estoque",
        "entrada_estoque",
        "saida_estoque",
        "ajuste_estoque",
        "movimentacao_interna",
    ],
    "maquinas": [
        "criar_equipamento",
        "manutencao_maquina",
        "abastecimento",
        "ordem_servico_maquina",
        "parada_maquina",
    ],
}


# ═══════════════════════════════════════════════════════════════════════
# HELPER: lista de campos obrigatórios por action_type (para validação rápida)
# ═══════════════════════════════════════════════════════════════════════

def get_required_fields(action_type: str) -> list[str]:
    """Retorna lista de nomes de campos obrigatórios para um action_type."""
    schema = ACTION_FIELDS_SCHEMA.get(action_type)
    if not schema:
        return []
    fields = schema.get("fields")
    if isinstance(fields, str):  # alias (ex: criar_item_estoque)
        ref_type = "criar_produto"  # currently the only alias
        fields = ACTION_FIELDS_SCHEMA.get(ref_type, {}).get("fields", {})
    return [f["name"] for f in fields.get("required", [])]


def get_optional_fields(action_type: str) -> list[str]:
    """Retorna lista de nomes de campos opcionais para um action_type."""
    schema = ACTION_FIELDS_SCHEMA.get(action_type)
    if not schema:
        return []
    fields = schema.get("fields")
    if isinstance(fields, str):
        ref_type = "criar_produto"
        fields = ACTION_FIELDS_SCHEMA.get(ref_type, {}).get("fields", {})
    return [f["name"] for f in fields.get("optional", [])]


def get_all_action_types() -> list[str]:
    """Retorna lista de todos os action_types disponíveis."""
    return list(ACTION_FIELDS_SCHEMA.keys())


# ═══════════════════════════════════════════════════════════════════════
# MAPA DE FERRAMENTAS AI → ACTION_TYPES (para referência do Isidoro)
# ═══════════════════════════════════════════════════════════════════════

TOOL_TO_ACTION_TYPE = {
    # Fazendas
    "criar_proprietario": "criar_proprietario",
    "criar_fazenda": "criar_fazenda",
    "criar_area": "criar_area",
    "criar_talhao": "criar_talhao",
    "registrar_arrendamento": "registrar_arrendamento",
    # Agricultura
    "criar_safra": "criar_safra",
    "registrar_colheita": "colheita",
    "registrar_movimentacao_carga": "movimentacao_carga",
    "registrar_operacao_agricola": "operacao_agricola",
    "registrar_manejo": "registrar_manejo",
    "registrar_ordem_servico_agricola": "ordem_servico_agricola",
    # Estoque
    "criar_produto_estoque": "criar_produto",
    "registrar_entrada_estoque": "entrada_estoque",
    "registrar_saida_estoque": "saida_estoque",
    "registrar_movimentacao_estoque": "movimentacao_interna",
    # Máquinas
    "criar_equipamento": "criar_equipamento",
    "registrar_abastecimento": "abastecimento",
    "registrar_ordem_servico_maquina": "ordem_servico_maquina",
    "registrar_manutencao_maquina": "manutencao_maquina",  # or parada_maquina or abastecimento depending on tipo_registro
}
