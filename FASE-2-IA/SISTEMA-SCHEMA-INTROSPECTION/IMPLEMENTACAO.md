# 💻 Implementação - Sistema de Introspection de Schema

**Guia prático de código | Date: 17 de março de 2026 | Versão: 1.0**

---

## 📋 Índice de Conteúdo

1. [Backend - ActionSchemaView](#backend---actionschemaview)
2. [Backend - ACTION_FIELDS_SCHEMA](#backend---action_fields_schema)
3. [IA Tool - consultar_schema_acao](#ia-tool---consultar_schema_acao)
4. [Integração - ISIDORO_SYSTEM_PROMPT](#integração---isidoro_system_prompt)
5. [Uso Prático - Exemplos](#uso-prático---exemplos)
6. [Testes & Validação](#testes--validação)

---

## Backend - ActionSchemaView

### Localização
```
/backend/apps/actions/views.py
```

### Código Completo

```python
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .ACTION_FIELDS_SCHEMA import ACTION_FIELDS_SCHEMA


class ActionSchemaView(APIView):
    """
    API View para introspection de schema de ações.
    
    Endpoints:
    - GET /api/actions/schema/
      → Retorna lista de todos action_types agrupado por módulo
    
    - GET /api/actions/schema/{action_type}/
      → Retorna schema completo (required + optional fields)
      
    Autenticação: Requer JWT válido
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, action_type=None):
        """
        GET request handler
        """
        try:
            if action_type is None:
                # Retorna lista de todas as ações
                return self._list_all_schemas(request)
            else:
                # Retorna schema específico
                return self._get_schema_detail(action_type)
                
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _list_all_schemas(self, request):
        """
        Retorna lista de todas as ações agrupadas por módulo
        """
        schemas_by_module = {}
        
        for action_type, schema in ACTION_FIELDS_SCHEMA.items():
            module = schema.get('module', 'unknown')
            
            if module not in schemas_by_module:
                schemas_by_module[module] = []
            
            schemas_by_module[module].append({
                'action_type': action_type,
                'description': schema.get('description', ''),
                'fields_count': len(schema.get('fields', {}).get('required', [])) + 
                               len(schema.get('fields', {}).get('optional', []))
            })
        
        return Response({
            'action_types': list(ACTION_FIELDS_SCHEMA.keys()),
            'count': len(ACTION_FIELDS_SCHEMA),
            'modules': schemas_by_module
        })
    
    def _get_schema_detail(self, action_type):
        """
        Retorna schema detalhado de uma ação específica
        """
        if action_type not in ACTION_FIELDS_SCHEMA:
            return Response(
                {
                    'error': f"Action '{action_type}' not found",
                    'available_actions': list(ACTION_FIELDS_SCHEMA.keys())
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        schema = ACTION_FIELDS_SCHEMA[action_type]
        
        return Response({
            'action_type': action_type,
            'module': schema.get('module'),
            'model_target': schema.get('model_target'),
            'description': schema.get('description'),
            'fields': schema.get('fields', {
                'required': [],
                'optional': []
            }),
            'related_lookups': schema.get('related_lookups', [])
        })
```

### URL Registration

```python
# /backend/apps/actions/urls.py

from django.urls import path
from .views import ActionSchemaView, ActionListView, ActionCreateView

urlpatterns = [
    # Schema introspection (BEFORE catch-all router)
    path('schema/', ActionSchemaView.as_view(), name='schema-list'),
    path('schema/<str:action_type>/', ActionSchemaView.as_view(), name='schema-detail'),
    
    # Existing endpoints
    path('', ActionListView.as_view(), name='action-list'),
    path('create/', ActionCreateView.as_view(), name='action-create'),
]
```

---

## Backend - ACTION_FIELDS_SCHEMA

### Localização
```
/backend/apps/actions/ACTION_FIELDS_SCHEMA.py
```

### Estrutura Geral

```python
# Arquivo grande (1.950 linhas)
# Contém definições para 23 ações

ACTION_FIELDS_SCHEMA = {
    # MÓDULO: Fazendas (6 ações)
    "criar_fazenda": { ... },
    "editar_fazenda": { ... },
    "excluir_fazenda": { ... },
    "consultar_fazenda": { ... },
    "listar_fazendas": { ... },
    "matriculas_fazenda": { ... },
    
    # MÓDULO: Agricultura (6 ações)
    "registrar_operacao_agricola": { ... },
    "registrar_safra": { ... },
    "movimentacao_carga": { ... },
    "consultar_sessoes_colheita_ativas": { ... },
    "registrar_aplicacao_agroquimica": { ... },
    "registrar_irrigacao": { ... },
    
    # MÓDULO: Estoque (6 ações)
    "entrada_estoque": { ... },
    "saida_estoque": { ... },
    "devolucao_estoque": { ... },
    "inventario_estoque": { ... },
    "consultar_produtos": { ... },
    "gerar_relatorio_estoque": { ... },
    
    # MÓDULO: Máquinas (5 ações)
    "criar_equipamento": { ... },
    "editar_equipamento": { ... },
    "registrar_abastecimento": { ... },
    "registrar_manutencao_equipamento": { ... },
    "consultar_historico_equipamento": { ... },
}
```

### Exemplo Completo: "criar_equipamento"

```python
ACTION_FIELDS_SCHEMA = {
    # ...
    
    "criar_equipamento": {
        "action_type": "criar_equipamento",
        "module": "maquinas",
        "model_target": "Equipamento",
        "description": "Registra um novo equipamento/máquina na fazenda",
        
        "fields": {
            "required": [
                {
                    "name": "nome",
                    "type": "str",
                    "max_length": 200,
                    "description": (
                        "Nome completo do equipamento. "
                        "Deve ser descritivo (marca + modelo ou tipo). "
                        "Exemplos: 'Trator John Deere 7200J', "
                        "'Grade Intermediária Tatu HS 2500'"
                    ),
                    "example": "Trator John Deere 7200J"
                },
                {
                    "name": "categoria",
                    "type": "str",
                    "choices": [
                        "Trator",
                        "Plantadeira",
                        "Pulverizador",
                        "Colhedora",
                        "Grade",
                        "Arado",
                        "Ensiladeira",
                        "Debulhador",
                        "Outros"
                    ],
                    "description": (
                        "Categoria/tipo do equipamento. "
                        "Selecione a mais apropriada da lista."
                    ),
                    "example": "Trator"
                },
                {
                    "name": "ano_fabricacao",
                    "type": "int",
                    "description": (
                        "Ano de fabricação do equipamento. "
                        "Deve estar entre 1950 e ano atual."
                    ),
                    "example": 2022,
                    "validation": "1950 <= year <= current_year"
                },
                {
                    "name": "valor_aquisicao",
                    "type": "Decimal",
                    "description": (
                        "Valor de aquisição em reais. "
                        "Usado para depreciação e contabilidade. "
                        "Deve ser maior que zero."
                    ),
                    "example": 850000.0,
                    "validation": "value > 0"
                }
            ],
            
            "optional": [
                {
                    "name": "marca",
                    "type": "str",
                    "max_length": 100,
                    "description": "Marca do equipamento (ex: John Deere, AGCO)",
                    "example": "John Deere",
                    "default": ""
                },
                {
                    "name": "modelo",
                    "type": "str",
                    "max_length": 100,
                    "description": "Modelo específico do equipamento",
                    "example": "7200J",
                    "default": ""
                },
                {
                    "name": "numero_serie",
                    "type": "str",
                    "max_length": 100,
                    "description": "Número de série/chassi do equipamento",
                    "example": "AAA11111JDR111111",
                    "default": ""
                },
                {
                    "name": "condicao",
                    "type": "str",
                    "choices": ["Novo", "Usado", "Restaurado", "Sucata"],
                    "description": "Condição do equipamento quando foi adquirido",
                    "example": "Novo",
                    "default": "Novo"
                },
                {
                    "name": "data_aquisicao",
                    "type": "date",
                    "description": "Data em que foi adquirido o equipamento",
                    "example": "2022-03-15",
                    "default": None
                },
                {
                    "name": "local_armazenamento",
                    "type": "str",
                    "max_length": 200,
                    "description": "Local onde o equipamento é armazenado",
                    "example": "Galpão A",
                    "default": ""
                },
                {
                    "name": "ativo",
                    "type": "bool",
                    "description": "Se o equipamento está em uso ou desativado",
                    "example": True,
                    "default": True
                }
            ]
        },
        
        "related_lookups": [
            {
                "field": "fazenda",
                "tool": "consultar_fazendas_disponiveis",
                "description": "Opcional: associar a uma fazenda específica"
            }
        ]
    },
    
    # ... outras ações ...
}
```

---

## IA Tool - consultar_schema_acao

### Localização
```
/zeroclaw_tools/tools/agrolink_tools.py
```

### Código da Tool

```python
@tool
def consultar_schema_acao(action_type: str, formato: str = "complete") -> str:
    """
    Consulta o schema (estrutura de campos) de uma ação disponível no sistema.
    
    Use SEMPRE esta tool ANTES de chamar ações principais, para descobrir
    quais campos são obrigatórios e opcionais.
    
    IMPORTANTE: Esta é a PRIMEIRA tool a chamar ao processar um comando do usuário!
    
    Parameters:
    -----------
    action_type : str
        - O tipo/nome da ação (ex: "criar_equipamento", "entrada_estoque")
        - Deixar em branco para listar todas as 23 ações disponíveis
        
    formato : str
        - "complete" (default): retorna todos os detalhes
        - Outros valores são ignorados (sempre retorna complete)
    
    Returns:
    --------
    str: JSON formatado com:
        - action_type: nome da ação
        - required: lista de campos obrigatórios com descrição, tipo, ex
        - optional: lista de campos opcionais com valores default
        - description: descrição da ação
        - examples: exemplos de uso
    
    Examples de Uso:
    ----------------
    1. PRIMEIRO: Descobrir campos
       > consultar_schema_acao(action_type="criar_equipamento")
       
       Retorna:
       {
         "action_type": "criar_equipamento",
         "required": [
           {"name": "nome", "type": "str", "description": "..."},
           {"name": "categoria", "type": "str", "description": "..."},
           ...
         ],
         "optional": [...]
       }
    
    2. DEPOIS: Coletar valores do usuário campo por campo
       > Pergunta: "Nome do equipamento?"
       > User: "Trator John Deere"
       
    3. FINALMENTE: Chamar ação com dados completos
       > criar_equipamento(
           nome="Trator John Deere",
           categoria="Trator",
           ano_fabricacao=2022,
           valor_aquisicao=850000.0
         )
    """
    try:
        from backend.apps.actions.ACTION_FIELDS_SCHEMA import ACTION_FIELDS_SCHEMA
        
        # Caso 1: Listar todas as ações
        if not action_type or action_type.strip() == "":
            result = {
                "all_actions": list(ACTION_FIELDS_SCHEMA.keys()),
                "count": len(ACTION_FIELDS_SCHEMA),
                "modules": {
                    "fazendas": ["criar_fazenda", "editar_fazenda", ...],
                    "agricultura": ["registrar_operacao_agricola", ...],
                    "estoque": ["entrada_estoque", ...],
                    "maquinas": ["criar_equipamento", ...]
                }
            }
            return json.dumps(result, ensure_ascii=False, indent=2)
        
        # Caso 2: Buscar ação específica
        if action_type not in ACTION_FIELDS_SCHEMA:
            return json.dumps({
                "error": f"Ação '{action_type}' não encontrada",
                "sugestoes": _find_similar_actions(action_type),
                "tentar": "Deixar action_type vazio para listar todas"
            }, ensure_ascii=False, indent=2)
        
        schema = ACTION_FIELDS_SCHEMA[action_type]
        
        # Formatar resposta
        result = {
            "action_type": action_type,
            "module": schema.get("module"),
            "description": schema.get("description"),
            "fields": {
                "required": _format_fields(schema.get("fields", {}).get("required", [])),
                "optional": _format_fields(schema.get("fields", {}).get("optional", []))
            },
            "instrucoes": (
                "1. Coletar TODOS os campos obrigatórios (required)\n"
                "2. Perguntar um de cada vez\n"
                "3. Confirmar os dados com usuário\n"
                "4. Oferecer opcionais (uma vez, e se não responder ignora)\n"
                "5. Executar a ação com os dados coletados"
            )
        }
        
        return json.dumps(result, ensure_ascii=False, indent=2)
    
    except Exception as e:
        return json.dumps({
            "error": f"Erro ao consultar schema: {str(e)}"
        }, ensure_ascii=False, indent=2)


def _format_fields(fields_list):
    """Helper: Formata lista de campos"""
    return [
        {
            "name": field.get("name"),
            "type": field.get("type"),
            "obrigatorio": field.get("obrigatorio", True),
            "description": field.get("description", ""),
            "example": field.get("example"),
            "choices": field.get("choices", []),
            "default": field.get("default")
        }
        for field in fields_list
    ]


def _find_similar_actions(action_name):
    """Helper: Encontra ações similares por nome"""
    from difflib import get_close_matches
    all_actions = list(ACTION_FIELDS_SCHEMA.keys())
    return get_close_matches(action_name, all_actions, n=3, cutoff=0.6)
```

### Registro da Tool

```python
# Em zeroclaw_tools/tools/__init__.py

from langchain.tools import tool
from .agrolink_tools import consultar_schema_acao

# Exportar para o toolkit
TOOLS = [
    consultar_schema_acao,
    # ... outras tools ...
]
```

---

## Integração - ISIDORO_SYSTEM_PROMPT

### Localização
```
/zeroclaw_tools/integrations/agrolink.py
```

### System Prompt (Seção Relevante)

```python
ISIDORO_SYSTEM_PROMPT = """
[... contexto anterior ...]

## NOVA SEÇÃO: 5-STEP WORKFLOW UNIVERSAL

Sempre que o usuário pedir para criar, registrar, ou modificar algo:

### PASSO 1: Descobrir Estrutura
Sempre comece chamando:
  
  tool: consultar_schema_acao(action_type="nome_da_acao")
  
Para descobrir:
- Quais campos são OBRIGATÓRIOS (required)
- Quais campos são OPCIONAIS (optional)
- Descrição e exemplos de cada campo

### PASSO 2: Coletar Obrigatórios
Para CADA campo obrigatório:

1. Reconheça se usuário já forneceu (ex: "Grade Tatu")
2. Se não forneceu, PERGUNTE EXPLICITAMENTE:
   "Qual é o {campo_nome}? {descrição curta}"
   
3. Armazene a resposta internamente

IMPORTANTE: Não assuma valores padrão ou omita campos!
Se campo é obrigatório e user não disse, PERGUNTA!

### PASSO 3: Confirmar Obrigatórios
Uma vez coletados todos os campos obrigatórios:

"Deixa eu confirmar os dados:
- Campo1: {valor}
- Campo2: {valor}
- Campo3: {valor}

Tá certo?"

### PASSO 4: Oferecer Opcionais (Uma Vez)
Se há campos opcionais:

"Quer adicionar {lista de opcionais}?"

Se user disser SIM: pergunte cada um
Se user disser NÃO ou não responder: ignore

### PASSO 5: Executar a Ação
Chame a tool principal com TODOS os dados coletados:

  tool: criar_equipamento(
    nome="{valor coletado}",
    categoria="{valor coletado}",
    ano_fabricacao={valor coletado},
    valor_aquisicao={valor coletado},
    marca="{if coletado}",  # opcional
    modelo="{if coletado}"  # opcional
  )

---

### REGRAS CRÍTICAS

🔴 NUNCA:
- Pule direto para executar sem consultar schema
- Crie campos ou nomes de campos inventados
- Assuma que um campo é obrigatório sem verificar schema
- Oferça opcionais múltiplas vezes após "não"
- Ignore resposta de user que já forneceu valor

✅ SEMPRE:
- Comece com consultar_schema_acao
- Pergunte campos obrigatórios um por um
- Confirme tudo antes de executar
- Ofereça opcionais apenas UMA VEZ
- Respeite as escolhas do usuário

---

### EXEMPLOS DE FLUXO

#### Exemplo 1: User fornece info parcial

User: "Registra um trator novo, marca John Deere, plantadeira usada"

1. Identificar: ações possíveis
   - Criar equipamento (trator) + criar equipamento (plantadeira)?
   - OU usuário está pedindo UMA ação por vez?
   → Pergunta: "Quer registrar os dois equipamentos ou só um?"

2. Se apenas trator:
   - Chamar: consultar_schema_acao("criar_equipamento")
   - Descobrir: required=[nome, categoria, ano_fabricacao, valor_aquisicao]
   - Já temos: marca="John Deere", categoria pode ser "Trator"
   - Faltam: nome (completo), ano, valor
   
3. Pergunte:
   - "Qual o modelo específico?" (ex: "John Deere 7200J")
   - "Em que ano foi fabricado?"
   - "Qual o valor de aquisição?" (pode ser aproximado)
   
4. Confirme: "Confirma: Trator John Deere 7200J, 2020, R$ 800.000?"

5. Opcionais: "Quer adicionar número de série ou local de armazenamento?"

#### Exemplo 2: User fornece tudo de uma vez

User: "Grade Intermediária Tatu HS 2500, ano 2015, valor 85.000, nova"

1. Chamar: consultar_schema_acao("criar_equipamento")

2. Reconhecer:
   - nome: "Grade Intermediária Tatu HS 2500"
   - categoria: "Grade" (inferir de "Grade Intermediária")
   - ano_fabricacao: 2015
   - valor_aquisicao: 85000.0
   - condicao: "Novo" (user disse "nova")
   
3. Confirmar: "Confirma: Grade Intermediária Tatu HS 2500, 2015, R$ 85.000, Novo?"

4. Executar com dados completos

---

### NÃO MODIFIQUE ESTE WORKFLOW
Este workflow foi testado para funcionar com TODAS as 23 ações.
Se precisar de customizações:
- Use schema para descobrir campos específicos
- Adapt confirmação/opcionais de acordo
- MAS MANTENHA: descobrir → coletar → confirmar → opcionais → executar

"""
```

---

## Uso Prático - Exemplos

### Exemplo 1: Criar Equipamento

#### Requisição HTTP (para teste manual)

```bash
# 1. Obter schema
curl -X GET \
  "http://localhost:8000/api/actions/schema/criar_equipamento/" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Criar equipamento
curl -X POST \
  "http://localhost:8000/api/actions/create/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "action_type": "criar_equipamento",
    "payload": {
      "nome": "Trator John Deere 7200J",
      "categoria": "Trator",
      "ano_fabricacao": 2022,
      "valor_aquisicao": 850000.0,
      "marca": "John Deere",
      "modelo": "7200J"
    }
  }'
```

#### Resposta Python (Isidoro)

```python
# Passo 1: Descob
