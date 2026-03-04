# UI & FORMS — Wireframes (esboços) e Especificação de Componentes

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — use `TenantContext` e `useTenant` para obter tenant atual.
- **Formulários (contratos):** Vários formulários (ex.: `ContratoForm`) ainda usam `FormData` com `documento_contrato`. Recomenda-se enviar JSON (`Content-Type: application/json`) com `documento` quando o backend usa `JSONField`, ou adaptar o serializer para aceitar ambos.
- **E2E:** Testes Playwright foram hardenizados (timeouts e helpers). Consulte `docs/archived/E2E_TEST_STATUS_FINAL.md`.

**Última Revisão:** Março 2026  

## Visão Geral
Este documento contém wireframes (esboços), listas de campos, regras de validação, responsabilidades de componentes, notas de acessibilidade e critérios de aceitação E2E para os formulários de *Empresa*, *Compra* e *DespesaPrestadora*.

---

## Objetivos ✅
- Entregar componentes de formulário acessíveis, mobile-first, consistentes com o sistema de design do app.
- Reutilizar entradas comuns (`Input`, `SelectFK`, `DatePicker`, `FileUpload`) sempre que possível.
- Fornecer validação clara e mensagens de erro inline úteis.
- Exibir erros retornados pelo backend de forma amigável ao usuário.

---

## 1) Empresa — Wireframe (esboço) & Campos

Wireframe (esboço) (desktop):
- Título: "Nova Empresa"
- Campos (coluna única / responsivo):
  - Nome (texto) — obrigatório
  - CNPJ (texto) — obrigatório, entrada mascarada
  - Contato (texto) — opcional (telefone/email)
  - Endereço (textarea) — opcional
  - Botões Salvar / Cancelar

Regras de validação:
- Nome: obrigatório, comprimento mínimo 2
- CNPJ: obrigatório, formato CNPJ válido (máscara client-side + comprimento básico); servidor valida unicidade

Notas de acessibilidade:
- Rótulos associados a entradas, use `aria-invalid` para erros
- Ordem de foco do teclado lógica (topo→baixo)

Critérios de aceitação:
- Enviar dados válidos cria a empresa e navega para a página de detalhes
- Erros inline são mostrados para problemas de validação

---

## 2) Compra (existente) — Revisão & Notas
- Página existente `/comercial/compras/new` usa `SelectFK` para fornecedor, `Input` para data e valor.
- Validação: fornecedor obrigatório, data obrigatória, valor > 0.
- E2E: Garantir que Playwright cubra criação, estado de erro e tratamento de entrada inválida na lista.

---

## 3) DespesaPrestadora — Wireframe (esboço) & Campos

Wireframe (esboço):
- Título: "Nova Despesa (Prestadora)"
- Campos:
  - Empresa (SelectFK) — obrigatório
  - Prestador (SelectFK) — opcional
  - Data (date) — obrigatório
  - Categoria (texto ou select) — obrigatório
  - Valor (number) — obrigatório > 0
  - Centro de Custo (select) — opcional
  - Descrição (textarea) — opcional
  - Salvar / Cancelar

Regras de validação:
- Empresa: obrigatório
- Data: obrigatório
- Categoria: obrigatório
- Valor: obrigatório, > 0

Acessibilidade & UX:
- Pré-preencher `empresa` ao chegar de uma página de detalhes Empresa via parâmetro de consulta `?empresa=123`.
- Mensagens de validação inline e focar primeiro campo inválido.

Critérios de aceitação:
- Criar uma despesa vinculada a uma empresa é possível e aparece na lista de despesas EmpresaDetail.

---

## Componentes para Reutilizar 🔧
- `Input` (rótulo, propagação de erro)

---

## Upload Patterns & Best Practices

### Padrão Recomendado: Botão no Header + Modal

Para uploads em seções do aplicativo (ex: Fiscal, Financeiro), use o padrão:

```
┌──────────────────────────────────────────┐
│ Seção Name                    [+ Nova X] │  ← Botão no header
├──────────────────────────────────────────┤
│ [Conteúdo da seção]                      │
│                                          │
└──────────────────────────────────────────┘
```

**Benefícios:**
- Botão sempre visível e consistente
- Modal não compromete layout
- Permite drag-and-drop
- Design moderno
- Escalável para múltiplos modelos

### Upload Modal Components

**NfeUploadModal.tsx** — Modal para uploads de Notas Fiscais
- Material-UI Dialog
- Drag-and-drop zone
- Suporte XML/PFX
- Progress indicator
- Error feedback

**UploadZone.tsx** — Componente reutilizável de drag-and-drop
- Detecta drag-over
- Validação de tipo de arquivo
- Visual feedback (highlight border)
- Multi-file support
- Acessível via teclado

### Fluxo de Upload

#### Via Botão (Tradicional)
```
1. Clica "Importar XML"
2. Modal abre
3. Arrasta ou clica para selecionar arquivo
4. Valida
5. Envia
6. Modal fecha, lista atualiza
```

#### Via Drag-and-Drop (Moderno)
```
1. Arrasta arquivo para qualquer parte da página
2. Feedback visual: "Solte aqui para importar"
3. Arquivo selecionado em modal automático
4. Envia
5. Modal fecha, lista atualiza
```

### Implementação Checklist

- [ ] Modal com Material-UI Dialog
- [ ] Dropzone com feedback visual
- [ ] Upload progress indicator
- [ ] Error handling com mensagens úteis
- [ ] Validação de tipo/tamanho no cliente
- [ ] Integração com API backend
- [ ] Refresh automático após sucesso
- [ ] Acessibilidade (labels, ARIA, keyboard nav)
- [ ] Mobile responsivo
- [ ] Teste com arquivos grandes (até 50MB)

### Referências

- **Módulo Fiscal:** `/fiscal` - Uploads de NF-e e Certificados
- **Módulo Financeiro:** `/financeiro` - Nova Despesa modal
- Material-UI Dialog: https://mui.com/material-ui/react-dialog/
- React Dropzone: https://react-dropzone.js.org/
- `SelectFK` (opções remotas, callbacks de valor)
- `DatePicker` / nativo `input type=date`
- `Button` / `ModalForm` ao trabalhar com modais

---

## Cenários E2E (Playwright) 🎭
- Empresa: criar uma nova empresa, afirmar redirecionamento para detalhes e presença na lista
- Compra: criar uma compra válida (já coberta); adicionar teste de submissão inválida
- DespesaPrestadora: criar com e sem prestador, afirmar que aparece na tabela EmpresaDetail
- Manifestação: manifestar uma NFe e verificar comportamento de UI (toast de sucesso/enqueued e histórico). Test file: `sistema-agropecuario/frontend/tests/e2e/manifestacao-enqueued.spec.ts`. Execução local (ex.): `PLAYWRIGHT_BASE_URL=http://localhost:5173 VITE_FISCAL_MANIFESTACAO_ENABLED=true npx playwright test sistema-agropecuario/frontend/tests/e2e/manifestacao-enqueued.spec.ts -q`

---

## Tarefas (curto prazo)
- [ ] Implementar `createEmpresa` e `createDespesaPrestadora` em `src/services/comercial.ts` (adicionar testes unitários onde viável)
- [ ] Adicionar página `EmpresaCreate` e rota `/comercial/empresas/new`
- [ ] Adicionar página `DespesaPrestadoraCreate` e rota `/comercial/despesas-prestadoras/new` (respeitar pré-preenchimento `?empresa=`)
- [ ] Adicionar testes E2E Playwright para os novos fluxos
- [ ] Atualizar docs e exemplos em `docs/` e `docs/ROTEIRO_REVISAO_APPS.md`

---

## 4) OperacaoWizard — Wireframe (esboço) & Campos

Wireframe (esboço) (assistente passo a passo):
- Passo 1: Seleção de Cultura/Safra
  - Cultura (SelectFK) — obrigatório
  - Safra (SelectFK) — obrigatório
- Passo 2: Detalhes da Operação
  - Tipo (Select) — obrigatório (plantio, colheita, etc.)
  - Data (DatePicker) — obrigatório
  - Talhão (SelectFK) — obrigatório
  - Quantidade (Input number) — obrigatório, >0
- Passo 3: Custos e Confirmação
  - Custo Estimado (Input currency) — opcional
  - Observações (Textarea) — opcional
  - Botões Confirmar / Voltar

Regras de validação:
- Todos os campos obrigatórios devem ser preenchidos
- Quantidade > 0
- Data não no futuro

Notas de acessibilidade:
- Indicadores de passo com rótulos ARIA
- Navegação por teclado entre passos

Critérios de aceitação:
- Assistente completa e cria operação
- Validação impede submissões inválidas

---

## 4) UserManagement — Interface RBAC (Documentada)

### Status: Especificações Criadas, Implementação Pendente
A interface UserManagement está completamente documentada mas não implementada no frontend.

### Wireframe (esboço) & Campos
Página principal `/admin/users` com tabela de usuários e controles de permissões.

**Componentes principais:**
- Tabela de usuários com colunas: Nome, Email, Perfil, Status, Ações
- Modal/Form para criar/editar usuário
- Seção de permissões por módulo com checkboxes

**Campos do formulário de usuário:**
- Username (texto) — obrigatório, único
- Email (email) — obrigatório, válido
- First Name (texto) — obrigatório
- Last Name (texto) — obrigatório
- Profile (select) — obrigatório, opções dos 7 perfis hierárquicos
- Is Active (checkbox) — padrão true

**Seção de permissões granulares:**
- Módulos: Financeiro, Fazendas, Agricultura, Estoque, Comercial, Fiscal, Administrativo
- Níveis: Read, Write, Admin (checkboxes)
- Aplicar automaticamente baseado no perfil selecionado

**Regras de validação:**
- Username: obrigatório, min 3 chars, único
- Email: obrigatório, formato válido, único
- Profile: obrigatório, deve ser um dos perfis válidos
- Permissões: validadas contra hierarquia (não pode ter permissões superiores ao perfil)

**Notas de acessibilidade:**
- Tabela com navegação por teclado
- Labels claros para todos os controles
- Indicadores visuais para status ativo/inativo
- Tooltips explicativos para níveis de permissão

**Critérios de aceitação E2E:**
- Criar usuário com perfil básico funciona
- Editar permissões reflete no backend
- Usuários sem permissões adequadas são bloqueados
- Interface responsiva em mobile/desktop

---

## Notas
Se a validação backend retornar erros de campo, exibi-los ao lado das entradas correspondentes; caso contrário, mostrar um toast de erro genérico.

Para quaisquer mudanças na API, manter compatibilidade retroativa e adicionar flags de recurso frontend se necessário.

---

(Gerado: 5 de janeiro de 2026; Atualizado: 16 de janeiro de 2026)