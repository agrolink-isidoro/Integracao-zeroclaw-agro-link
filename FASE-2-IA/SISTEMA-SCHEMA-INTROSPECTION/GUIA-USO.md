# 📖 Guia de Uso - Schema Introspection por Módulo

**Exemplos práticos e casos de uso | Date: 17 de março de 2026 | Versão: 1.0**

---

## 📋 Índice

1. [Módulo Fazendas](#módulo-fazendas)
2. [Módulo Agricultura](#módulo-agricultura)
3. [Módulo Estoque](#módulo-estoque)
4. [Módulo Máquinas](#módulo-máquinas)
5. [Troubleshooting Comum](#troubleshooting-comum)
6. [Checklist de Uso](#checklist-de-uso)

---

## Módulo Fazendas

### Caso de Uso: Registrar Nova Fazenda

```
User: "Preciso registrar uma új fazenda que comprei"

PASSO 1: Descobrir campos
┌─────────────────────────────────────────────────────┐
│ Tool: consultar_schema_acao("criar_fazenda")        │
│                                                     │
│ Resposta:                                           │
│ action_type: criar_fazenda                          │
│ required: [nome, municipio, proprietario]           │
│ optional: [tamanho_hectares, cultivos, latitude]    │
└─────────────────────────────────────────────────────┘

PASSO 2: Coletar obrigatórios
Isidoro: "Qual é o nome da fazenda?"
User: "Fazenda Bom Sucesso"

Isidoro: "Em qual município fica?"
User: "Santa Maria"

Isidoro: "Quem é o proprietário?"
User: "João da Silva"

PASSO 3: Confirmar
Isidoro: "Deixa confirmar:
- Nome: Fazenda Bom Sucesso
- Município: Santa Maria
- Proprietário: João da Silva

Tá certo?"
User: "Sim"

PASSO 4: Opcionais
Isidoro: "Quer adicionar tamanho da fazenda, cultivos principais ou 
coordenadas geográficas?"
User: "Adds tamanho: 250 hectares"

PASSO 5: Executar
Tool: criar_fazenda(
  nome="Fazenda Bom Sucesso",
  municipio="Santa Maria",
  proprietario="João da Silva",
  tamanho_hectares=250
)
```

### Ações Disponíveis - Fazendas

| Ação | Obrigatórios | Opcionais | Caso de Uso |
|------|------------|-----------|-----------|
| `criar_fazenda` | nome, municipio, proprietario | tamanho_hectares, cultivos, latitude | Registrar nova propriedade |
| `editar_fazenda` | fazenda_id | todos | Atualizar dados de fazenda |
| `consultar_fazenda` | fazenda_nome (parcial) | - | Buscar informações |
| `listar_fazendas` | - | filtro_municipio, ativo | Listar todas as fazendas |
| `matriculas_fazenda` | fazenda_id | - | Ver matrículas/parcelas |
| `excluir_fazenda` | fazenda_id | motivo | Desativar fazenda |

---

## Módulo Agricultura

### Caso de Uso 1: Registrar Operação Agrícola

```
User: "Registra a aplicação de agroquímico que fiz hoje"

PASSO 1: Descobrir
Tool: consultar_schema_acao("registrar_aplicacao_agroquimica")

required: [data, produto_quimico, dosagem, area_aplicada, fazenda]
optional: [talhao, equipamento_usado, condicoes_clima, responsavel]

PASSO 2: Coletar
Isidoro: "Data da aplicação?" User: "Hoje (17/03/2026)"
Isidoro: "Qual produto?" User: "Herbicida 2,4-D"
Isidoro: "Dosagem?" User: "2.5 litros por hectare"
Isidoro: "Qual area?" User: "15 hectares"
Isidoro: "Qual fazenda?" User: "Fazenda Bom Sucesso"

PASSO 3: Confirmar
"Aplicação: 2,4-D | 2.5 L/ha | 15 ha | 17/03/2026 | Fazenda Bom Sucesso?"

PASSO 4: Opcionais
"Talhao específica? Qual equipamento? Condições do clima?"

PASSO 5: Executar
Tool: registrar_aplicacao_agroquimica(
  data="2026-03-17",
  produto_quimico="Herbicida 2,4-D",
  dosagem="2.5 L/ha",
  area_aplicada=15,
  fazenda="Fazenda Bom Sucesso",
  talhao="A1" (se fornecido)
)
```

### Caso de Uso 2: Registrar Movimentação de Carga (Colheita)

```
User: "Registra a pesagem do caminhão que chegou da colheita"

PASSO 1: Descobrir
Tool: consultar_schema_acao("movimentacao_carga")

required: [peso_bruto, tara, data_movimentacao]
optional: [placa, motorista, safra, talhao, descontos, observacoes]

PASSO 2: Coletar
Isidoro: "Peso bruto? (caminhão + carga)"
User: "28.500 kg"

Isidoro: "Tara? (peso do caminhão vazio)"
User: "13.200 kg"

Isidoro: "Data?"
User: "17/03/2026 às 14:30"

PASSO 3: Confirmar
"Pesagem: 28.500 kg bruto, 13.200 kg tara, 17/03/2026?
Peso líquido: 15.300 kg"

PASSO 4: Opcionais
"Placa do caminhão? Motorista? Talhão de origem?"
User: "Placa: OLV-9987"

PASSO 5: Executar
Tool: movimentacao_carga(
  peso_bruto=28500.0,
  tara=13200.0,
  data_movimentacao="2026-03-17 14:30:00",
  placa="OLV-9987"
)
```

---

## Módulo Estoque

### Caso de Uso: Entrada de Produto em Estoque

```
User: "Registra a entrada de sementes que chegou"

PASSO 1: Descobrir
Tool: consultar_schema_acao("entrada_estoque")

required: [nome_produto, quantidade, unidade, data_entrada]
optional: [numero_nf, valor_unitario, lote, data_vencimento, fornecedor]

PASSO 2: Coletar
Isidoro: "Nome do produto?"
User: "Sementes de Milho Hybrid 2B707"

Isidoro: "Quantidade?"
User: "50 sacas de 20 kg"

Isidoro: "Unidade? (saca/kg/litro/unidade)"
User: "Saca"

Isidoro: "Data da entrada?"
User: "17/03/2026"

PASSO 3: Confirmar
"Entrada: Sementes Milho 2B707, 50 sacas, 17/03/2026?"

PASSO 4: Opcionais
"Número nota fiscal? Valor unitário? Lote? Data vencimento? Fornecedor?"
User: "NF 12345, R$ 250 por saca, Lote SA-2026-001"

PASSO 5: Executar
Tool: entrada_estoque(
  nome_produto="Sementes de Milho Hybrid 2B707",
  quantidade=50,
  unidade="saca",
  data_entrada="2026-03-17",
  numero_nf="12345",
  valor_unitario=250.0,
  lote="SA-2026-001"
)

Result: Estoque atualizado: 50 sacas → 150 sacas (total)
```

---

## Módulo Máquinas

### Caso de Uso 1: Criar Equipamento

```
User: "Adiciona o trator novo que cheguou"

PASSO 1: Descobrir
Tool: consultar_schema_acao("criar_equipamento")

required: [nome, categoria, ano_fabricacao, valor_aquisicao]
optional: [marca, modelo, numero_serie, condicao, data_aquisicao, local_armazenamento]

PASSO 2: Coletar
Isidoro: "Nome do equipamento?"
User: "Trator padrão para lavoura"

Isidoro: "Categoria? (Trator/Plantadeira/Pulverizador/Colhedora/Grade/...)"
User: "Trator"

Isidoro: "Ano de fabricação?"
User: "2022"

Isidoro: "Valor de aquisição?"
User: "R$ 850.000 reais"

PASSO 3: Confirmar
"Trator, fabricação 2022, valor R$ 850.000?"

PASSO 4: Opcionais
"Marca? Modelo? Serial? Condição? Data compra? Local?"
User: "John Deere 7200J, serial JD-20220615-001, novo, Galpão A"

PASSO 5: Executar
Tool: criar_equipamento(
  nome="Trator padrão para lavoura",
  categoria="Trator",
  ano_fabricacao=2022,
  valor_aquisicao=850000.0,
  marca="John Deere",
  modelo="7200J",
  numero_serie="JD-20220615-001",
  condicao="Novo",
  local_armazenamento="Galpão A"
)
```

### Caso de Uso 2: Registrar Abastecimento

```
User: "Enche o tanque do trator (matrícula MD-001)"

PASSO 1: Descobrir
Tool: consultar_schema_acao("registrar_abastecimento")

required: [maquina_id, quantidade_litros, valor_unitario, data]
optional: [tipo_combustivel, custo_total, horimetro, local_abastecimento, responsavel]

PASSO 2: Coletar
Isidoro: "Qual trator? (ID ou nome)"
User: "JD-7200J (ou código: MD-001)"

Isidoro: "Quantos litros?"
User: "320 litros"

Isidoro: "Valor unitário?"
User: "R$ 6.50"

Isidoro: "Data?"
User: "17/03/2026 08:30"

PASSO 3: Confirmar
"Abastecimento: JD-7200J, 320L, R$ 6.50/L, custo R$ 2.080, 17/03/2026?"

PASSO 4: Opcionais
"Tipo combustível? Horimetro? Local? Responsável?"
User: "Diesel, horimetro: 8.640h, bomba do Parque"

PASSO 5: Executar
Tool: registrar_abastecimento(
  maquina_id="MD-001",
  quantidade_litros=320,
  valor_unitario=6.50,
  data="2026-03-17 08:30:00",
  tipo_combustivel="Diesel",
  horimetro=8640,
  local_abastecimento="Bomba do Parque"
)

Result: Custo total: R$ 2.080 registrado
```

---

## Troubleshooting Comum

### Problema: "Erro - Campo obrigatório não preenchido"

```
❌ Sintoma:
User: "Registra a pesagem: 28.500 e 13.200"
Isidoro chama tool SEM perguntar a data
Result: Error - data_movimentacao required

✅ Solução:
1. Isidoro consultou schema?
   - Se NÃO: chamar consultar_schema_acao ANTES
   
2. Schema retornou qual campo é obrigatório?
   - Verificar resposta do schema
   - data_movimentacao está em "required": [...]?
   
3. Isidoro perguntou mesmo assim?
   - Check ISIDORO_SYSTEM_PROMPT Step 2
   - Requer: perguntar campo por campo
   
4. Solução:
   - Isidoro deve voltar e periguntar: "Qual a data/hora?"
   - User fornece: "17/03/2026"
   - Reexecuta com campo completo
```

### Problema: "Tool retorna 404 - action type não encontrado"

```
❌ Sintoma:
Tool: consultar_schema_acao("criar_grade")
Response: {"error": "Action 'criar_grade' not found"}

✅ Causas possíveis:
1. Nome da ação errada
   - Schema.keys() não tem "criar_grade"
   - Verificar: é "criar_equipamento" para todos?
   
2. Ação existe mas em outro módulo
   - Ex: "registrar_operacao_agricola" vs "registrar_aplicacao_agroquimica"
   - Ambas existem, qual usar?
   
3. Solução:
   - Chamar: consultar_schema_acao(action_type="")
   - Retorna lista de todas 23 ações disponíveis
   - User escolhe qual executar
```

### Problema: "User fornece valor inválido para campo"

```
❌ Exemplo:
Isidoro: "Ano de fabricação?"
User: "Anterior a 1950"
Schema says: validation: "1950 <= year <= current_year"

Isidoro: "Ano precisa estar entre 1950 e 2026"
User: "Ah, é 1945"

✅ Solução:
Isidoro: "Infelizmente 1945 é anterior a 1950. Qual é o ano correto?"
User: "1970"
Isidoro: "Perfeito, 1970 tá válido"

Rule: Use "validation" do schema para dar feedback útil
```

---

## Checklist de Uso

### Checklist para Desenvolvedores

- [ ] Consultar schema ANTES de coletar dados
- [ ] Verificar que action_type está em ACTION_FIELDS_SCHEMA
- [ ] Perguntar CADA campo obrigatório individualmente
- [ ] Confirmar dados antes de executar
- [ ] Oferecer opcionais UMA VEZ APENAS
- [ ] Respectar decisões do user (dont repeat optionals)
- [ ] Incluir descrição/exemplo do schema na pergunta
- [ ] Validar tipo/range de dados
- [ ] Executar com dados COMPLETOS
- [ ] Relatar erro ao user de forma clara

### Checklist para Usuários

- [ ] Eu entendo o que a ação vai fazer?
- [ ] Confirmei todos os dados obrigatórios?
- [ ] Os valores estão corretos?
- [ ] Eu quis adicionar opcionais? (user's choice)
- [ ] Após execução, resultado foi confirmado?
- [ ] Se erro: Isidoro ofereceu solução ou retry?

---

## Tabela Rápida - Todas as 23 Ações

### Fazendas (6)

| Ação | Obrigatórios | Quando usar |
|------|------------|-----------|
| criar_fazenda | nome, municipio, proprietario | Nova propriedade |
| editar_fazenda | fazenda_id | Atualizar dados |
| consultar_fazenda | nome_parcial | Buscar propriedade |
| listar_fazendas | - | Ver todas |
| matriculas_fazenda | fazenda_id | Ver parcelas |
| excluir_fazenda | fazenda_id | Desativar |

### Agricultura (6)

| Ação | Obrigatórios | Quando usar |
|------|------------|-----------|
| registrar_operacao_agricola | fazenda, tipo, data | Nova operação |
| registrar_safra | nome, plantio, colheita | Nova safra/ciclo |
| registrar_aplicacao_agroquimica | data, produto, dosagem, area | Químicos aplicados |
| movimentacao_carga | peso_bruto, tara | Pesagem colheita |
| registrar_irrigacao | area, volume, data | Irrigação executada |
| consultar_sessoes_colheita_ativas | - | Quais colheitas em andamento |

### Estoque (6)

| Ação | Obrigatórios | Quando usar |
|------|------------|-----------|
| entrada_estoque | nome_produto, quantidade, unidade | Produto chega |
| saida_estoque | produto_id, quantidade | Retirar estoque |
| devolucao_estoque | saida_id | Devolver entry |
| inventario_estoque | data, produto | Contar físico |
| consultar_produtos | - | Listar produtos |
| gerar_relatorio_estoque | periodo | Relatório estoque |

### Máquinas (5)

| Ação | Obrigatórios | Quando usar |
|------|------------|-----------|
| criar_equipamento | nome, categoria, ano, valor | Novo equipamento |
| editar_equipamento | equipamento_id | Atualizar dados |
| registrar_abastecimento | maquina_id, qtd, valor, data | Abastecimento |
| registrar_manutencao | maquina_id, tipo, data | Manutenção |
| consultar_historico | maquina_id | Ver histórico |

---

## Próximas Etapas

1. **Testes com Usuários**: Validar campo-a-campo com operadores reais
2. **Refinamento de Exemplos**: Ajustar based on feedback
3. **Documentação em WhatsApp**: Adicionar ajuda inline no chat
4. **Métricas**: Rastrear qual % de ações usa schema (target: 100%)

