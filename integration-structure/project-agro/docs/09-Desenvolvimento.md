# Guia de Continuação do Desenvolvimento

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — o backend e frontend propagam e respeitam tenant active.
- **Operação local:** Não execute servidores como `root`; use Docker Compose ou usuário sem privilégios. Revise `start-servers.sh` para dev-friendly usage.
- **Principal pendência:** Harmonizar formulários que enviam `FormData` com backend que usa `JSONField` (campo `documento` vs `documento_contrato`).

**Última Revisão:** Março 2026  
**Para:** Próximo agente ou desenvolvedor  
**Quando:** Retomar após pausa ou mudança de contexto  
**Branch:** `main`

---

## 🚀 Início Rápido (5 minutos)

### 1. Clone e Setup (se necessário)
```bash
# Clone do repositório
git clone https://github.com/tyrielbr/project-agro.git
cd project-agro/sistema-agropecuario

# Checkout da branch de trabalho
git checkout refactor-operacoes
git pull origin refactor-operacoes
```

### 2. Backend
```bash
cd backend

# Ativar ambiente virtual (se necessário)
# python -m venv venv
# source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate     # Windows

# Instalar dependências (se necessário)
pip install -r requirements.txt

# Executar migrações (se necessário)
python manage.py migrate

# Iniciar servidor
python manage.py runserver 0.0.0.0:8000

# OU em background:
nohup python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1 &
```

### 3. Frontend
```bash
# Recomendado (Docker Compose):
cd sistema-agropecuario
docker compose up -d --build frontend

# Alternativa (dev local):
cd frontend
VITE_API_BASE='http://localhost:8001/api/' npm install
VITE_API_BASE='http://localhost:8001/api/' npm run dev -- --host 0.0.0.0 --port 5173

# Em background (dev local):
nohup VITE_API_BASE='http://localhost:8001/api/' npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/vite.log 2>&1 &
```

### 4. Verificar Funcionamento
```bash
# Backend
curl http://localhost:8000/api/agricultura/operacoes/

# Frontend
curl http://localhost:5173

# Browser
# Abrir: http://localhost:5173
# Login: use credenciais existentes ou crie uma conta
```

---

## 📖 Leitura Essencial

**Ordem de leitura sugerida:**

1. **[README.md](./README.md)** - Índice geral (2 min)
2. **[CONTEXTO_PROJETO.md](./CONTEXTO_PROJETO.md)** - Entender o projeto (10 min)
3. **[FASE_ATUAL.md](./FASE_ATUAL.md)** - Ver status e últimas mudanças (5 min)
4. **Este arquivo** - Instruções de continuação (você está aqui!)
5. **[ESTRUTURA_CODIGO.md](./ESTRUTURA_CODIGO.md)** - Mapa de arquivos (conforme necessidade)
6. **[HISTORICO_DESENVOLVIMENTO.md](./HISTORICO_DESENVOLVIMENTO.md)** - Contexto histórico (opcional)

**Tempo total:** ~20 minutos

---

## 📊 Estado Atual do Sistema (Revisão Geral)

### ✅ Backend - Funcionalidades Implementadas

#### Core & Autenticação
- ✅ Sistema de usuários Django padrão
- ✅ JWT authentication (djangorestframework-simplejwt)
- ✅ Grupos e permissões

#### Administrativo
- ✅ Funcionários (CRUD completo)
- ✅ Centros de Custo (hierarquia)
- ✅ Folha de Pagamento (cálculos básicos)
- ✅ Despesas Administrativas
- ✅ Configurações do Sistema
- ✅ Logs de Auditoria

#### Fazendas
- ✅ Proprietários
- ✅ Fazendas (com localização)
- ✅ Talhões (áreas geoespaciais)
- ✅ Arrendamentos
- ✅ Coletas (amostras)

#### Agricultura
- ✅ Culturas e Safras
- ✅ Operações (CRUD completo, unificado)
- ✅ Movimentações de Carga
- ✅ Colheitas
- ✅ Tipos dinâmicos por categoria

#### Estoque
- ✅ Produtos e Lotes
- ✅ Movimentações (entrada/saída)
- ✅ Categorias NCM
- ✅ Inventário

#### Financeiro
- ✅ Vencimentos (despesas/receitas)
- ✅ Rateios de Custos (com aprovações)
- ✅ Financiamentos (separado)
- ✅ Empréstimos (separado)
- ✅ Instituições Financeiras (BACEN)
- ✅ **IMPLEMENTADO (Sprint 1):** Livro Caixa (`ContaBancaria`), `Lancamento` e endpoints de quitação; testes unitários, integração e E2E localmente verificados. PR: https://github.com/tyrielbr/project-agro/pull/105 (mergeable).

#### Fiscal
- ✅ NFEs (processamento)
- ✅ Certificados Digitais
- ✅ Validações SEFAZ
- ✅ Cálculos de Impostos

#### Comercial
- ✅ Fornecedores
- ✅ Empresas Parceiras
- ✅ Contratos
- ✅ Vendas
- ✅ Clientes
- ✅ Instituições Financeiras
- ✅ **Integração com Estoque (parcialmente implementada):** `Localizacao` e `ProdutoArmazenado` implementados; vendas/compras começam a suportar local de armazenamento e Movimentações automáticas via confirmação de NFe. (ver `docs/Comercial_Revamp/FASE1_IMPLEMENTATION_COMPLETE.md` e `docs/04-Modulos/Estoque.md`)
- 🔧 **Próximos passos:** concluir forms granulares e UX de seleção de local de armazenamento (frontend)

#### Máquinas
- ✅ Equipamentos
- ✅ Abastecimentos
- ✅ Manutenções
- ✅ Alocações

### ✅ Frontend - Funcionalidades Implementadas

#### Core
- ✅ Login/Logout
- ✅ Dashboard principal
- ✅ Navegação responsiva (Bootstrap)
- ✅ Componentes comuns (Input, SelectFK, etc.)

#### Administrativo
- ✅ CRUD Funcionários
- ✅ CRUD Centros de Custo
- ✅ Folha de Pagamento
- ✅ Despesas Administrativas

#### Fazendas
- ✅ CRUD Proprietários/Fazendas/Talhões
- ✅ Mapas (Leaflet)

#### Agricultura
- ✅ Wizard Operações (4 etapas)
- ✅ Listagem com filtros
- ✅ Detalhes e estatísticas

#### Estoque
- ✅ CRUD Produtos
- ✅ Movimentações

#### Financeiro
- ✅ Dashboard financeiro
- ✅ Rateios com aprovações
- ✅ Vencimentos (lista/calendário)
- ✅ Financiamentos (CRUD separado)
- ✅ Empréstimos (CRUD separado)
- ❌ **FALTANDO:** Integração Empréstimo/Financiamento em form único, livro caixa

#### Fiscal
- ✅ Processamento NFEs
- ✅ Certificados

#### Comercial
- ✅ CRUD Fornecedores/Clientes
- ✅ Contratos e Vendas
- ❌ **FALTANDO:** Forms incompletos, pouca integração com Estoque

#### Máquinas
- ✅ CRUD Equipamentos
- ✅ Abastecimentos/Manutencões

### 🚧 Pendências Críticas (Próximas Prioridades)

#### Financeiro
1. **Livro Caixa**
   - Modelo ContaBancaria (agência, conta, saldo)
   - Movimentações bancárias (débitos/créditos)
   - Conciliação automática

2. **Integração Empréstimo/Financiamento**
   - Unificar models (herança ou campo tipo)
   - Form único com campos condicionais
   - Frontend: componente único

3. **Revisar Forms Vinculados**
   - Vinculação automática com Fornecedores/Clientes
   - Validações cross-module

#### Comercial
1. **Integração com Estoque**
   - Local de armazenamento em vendas/compras
   - Movimentações automáticas
   - Controle de lotes por fornecedor

2. **Forms Granulares**
   - Contratos: campos específicos por tipo
   - Vendas: integração com colheitas
   - Fornecedores: histórico de performance

#### Frontend - UI/UX
1. **Design System**
   - Padronização cores/tipografia
   - Componentes consistentes
   - Tema dark/light

2. **Layout Melhorias**
   - Responsividade mobile-first
   - Performance (lazy loading)
   - Acessibilidade (ARIA labels)

3. **Dashboards**
   - Gráficos interativos (Chart.js)
   - KPIs em tempo real
   - Filtros avançados

---

## 🎯 Estado Atual do Projeto (Foco Operações)

### ✅ O Que Está Funcionando

#### Backend
- ✅ Modelo `Operacao` unificado completo
- ✅ API REST com CRUD completo
- ✅ Endpoint de tipos dinâmicos por categoria
- ✅ Serializers otimizados
- ✅ Filtros e busca funcionando
- ✅ Cálculo de área e custos correto (Decimal)
- ✅ Relacionamentos com Safras, Talhões, Equipamentos
- ✅ **Correção (27/12/2025):** Validação de `Produto` para updates parciais (PATCH) — `principio_ativo` e `composicao_quimica` expostos no serializer; testes adicionados e já aplicados na branch `main`.

#### Frontend
- ✅ Wizard de criação (4 etapas)
- ✅ Listagem com tabela responsiva
- ✅ Visualização de detalhes
- ✅ Estatísticas por status
- ✅ Seleção automática de talhões por safra
- ✅ Operações mecânicas no dropdown
- ✅ Design Bootstrap responsivo
- ✅ Navegação entre páginas
- ✅ Error handling

### 🚧 O Que Falta (Próximas Fases)

#### Alta Prioridade (Financeiro & Comercial)
1. **Financeiro - Livro Caixa**
   - Criar modelo `ContaBancaria` (agência, conta, saldo atual)
   - Movimentações bancárias (débitos/créditos)
   - Conciliação automática com extratos
   - Integração com Vencimentos

2. **Financeiro - Unificar Empréstimo/Financiamento**
   - Refatorar models para herança ou campo `tipo`
   - Form único com campos condicionais
   - Frontend: componente `CreditoForm` único

3. **Comercial - Integração Estoque**
   - Adicionar `local_armazenamento` em Vendas/Compras
   - Movimentações automáticas no Estoque
   - Controle de lotes por fornecedor

4. **Comercial - Forms Granulares**
   - Contratos: campos específicos por tipo (preços, prazos)
   - Vendas: vinculação com colheitas/safras
   - Fornecedores: métricas de performance

#### Média Prioridade (Frontend UI/UX)
5. **Design System Completo**
   - Paleta de cores consistente
   - Tipografia padronizada
   - Componentes reutilizáveis (Button, Card, etc.)

6. **Dashboards Interativos**
   - Gráficos Chart.js em todos os módulos
   - KPIs em tempo real
   - Filtros avançados por período/talhao

7. **Responsividade Mobile**
   - Otimização para tablets/celulares
   - Navegação touch-friendly
   - Performance em conexões lentas

#### Baixa Prioridade
8. **Testes E2E**
   - Playwright para fluxos críticos
   - Cobertura CI/CD

9. **Documentação API**
   - OpenAPI/Swagger
   - Exemplos de uso

10. **Performance**
    - Cache Redis
    - Otimização queries
    - Lazy loading imagens

---

## 🔍 Como Encontrar Coisas

### Onde Está o Código?

#### Operações (Recém Implementado)
```
Backend:
- Modelo: backend/apps/agricultura/models.py (classe Operacao)
- Views: backend/apps/agricultura/views.py (OperacaoViewSet)
- Serializers: backend/apps/agricultura/serializers.py (OperacaoSerializer)
- URLs: backend/apps/agricultura/urls.py

Frontend:
- Wizard: frontend/src/components/agricultura/OperacaoWizard.tsx
- Lista: frontend/src/components/agricultura/OperacoesList.tsx
- Detalhes: frontend/src/components/agricultura/OperacaoDetalhes.tsx
- Página: frontend/src/pages/agricultura/Operacoes.tsx
- Service: frontend/src/services/operacoes.ts
- Rotas: frontend/src/App.tsx
```

#### Outros Módulos
```
Fazendas:
- Backend: backend/apps/fazendas/
- Frontend: frontend/src/pages/fazendas/

Culturas/Safras:
- Backend: backend/apps/agricultura/ (Cultura, Plantio)
- Frontend: frontend/src/pages/agricultura/
```

### Como Debugar?

#### Backend
```bash
# Ver logs do Django
tail -f /tmp/django.log

# Shell Django interativo
python manage.py shell

# Testar endpoint direto
curl -X GET http://localhost:8000/api/agricultura/operacoes/ | python3 -m json.tool
```

#### Frontend
```bash
# Ver logs do Vite
tail -f /tmp/vite.log

# Console do navegador
# F12 > Console

# React DevTools
# Instalar extensão do navegador
```

#### Banco de Dados
```bash
# Acessar banco (Postgres via docker-compose; use psql ou python manage.py dbshell)
cd backend
python manage.py dbshell

# Verificar operações
SELECT id, categoria, tipo, status FROM agricultura_operacao LIMIT 10;
```

---

## 💡 Dicas e Truques

### 1. Problemas Comuns

#### "Erro 500 no Backend"
```bash
# Verificar logs
tail -50 /tmp/django.log

# Problema comum: Decimal + Float
# Solução: Sempre usar Decimal('0') em cálculos
```

#### "Componente não carrega no Frontend"
```bash
# Limpar cache do Vite
npm run dev -- --force

# Verificar erros no console (F12)
```

#### "CORS Error"
```python
# backend/sistema_agropecuario/settings/base.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
```

### 2. Convenções de Código

#### Backend (Python/Django)
```python
# Sempre usar Decimal para valores monetários/área
from decimal import Decimal
total = Decimal('0')

# Preferir select_related/prefetch_related
queryset = Operacao.objects.select_related('plantio').prefetch_related('talhoes')

# Serializers com campos calculados
area_total_ha = serializers.ReadOnlyField()
```

#### Frontend (React/TypeScript)
```typescript
// Usar interfaces explícitas
interface Operacao {
  id: number;
  categoria: string;
  // ...
}

// Preferir Bootstrap sobre Tailwind
<div className="card">  // ✅
<div className="bg-white rounded">  // ❌ (pode não funcionar)

// Usar service layer
import operacoesService from '@/services/operacoes';
const data = await operacoesService.listar();
```

### 3. Git Workflow

```bash
# Sempre trabalhar na branch correta
git checkout refactor-operacoes

# Commits semânticos
git commit -m "feat: adicionar filtro por categoria"
git commit -m "fix: corrigir cálculo de custo total"
git commit -m "refactor: reorganizar componentes"

# Push frequente
git push origin refactor-operacoes

# Ver histórico recente
git log --oneline -10
```

---

## 🎓 Aprendizados da FASE 4

### O Que Funcionou Bem ✅
1. **Bootstrap + Inline Styles:** Solução para conflitos com Tailwind
2. **Wizard Multi-Etapa:** UX intuitiva, validação por etapa
3. **API Dinâmica:** Tipos carregados por categoria
4. **Seleção Automática:** Talhões por safra economiza cliques
5. **useEffect com Cleanup:** Evitar loops infinitos

### O Que Evitar ❌
1. **Misturar Tailwind com Bootstrap:** Preferir Bootstrap
2. **Float em Cálculos:** Usar sempre Decimal
3. **Campos Opcionais sem Fallback:** Sempre `|| 0` ou `?.`
4. **Muitos Re-renders:** Cuidado com dependencies em useEffect
5. **Alerts Nativos:** Usar modals ou toasts

---

## 🔄 Fluxo de Trabalho Sugerido

### Para Adicionar Nova Feature

1. **Planejamento (5 min)**
   - Ler [FASE_ATUAL.md](./FASE_ATUAL.md)
   - Escolher item de "O Que Falta"
   - Definir escopo mínimo

2. **Backend (se necessário)**
   - Adicionar campo/método no model
   - Criar migração
   - Atualizar serializer
   - Adicionar endpoint/action
   - Testar com curl

3. **Frontend**
   - Atualizar interface TypeScript
   - Atualizar service
   - Criar/modificar componente
   - Testar no browser

4. **Commit & Push**
   - Commit com mensagem semântica
   - Push para refactor-operacoes

5. **Documentar**
   - Atualizar [FASE_ATUAL.md](./FASE_ATUAL.md)
   - Adicionar em "Completado"
   - Listar problemas encontrados

### Para Corrigir Bug

1. **Reproduzir**
   - Entender passos para reproduzir
   - Verificar logs (backend/frontend)
   - Usar debugger se necessário

2. **Localizar**
   - Grep no código: `grep -r "termo" frontend/src/`
   - Verificar stack trace
   - Consultar [ESTRUTURA_CODIGO.md](./ESTRUTURA_CODIGO.md)

3. **Corrigir**
   - Fazer fix mínimo
   - Testar cenário original
   - Testar edge cases

4. **Documentar**
   - Commit com "fix: descrição clara"
   - Adicionar em "Problemas Resolvidos"

---

## 📚 Recursos Úteis

### Documentação
- Django: https://docs.djangoproject.com/
- DRF: https://www.django-rest-framework.org/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Bootstrap 5: https://getbootstrap.com/docs/5.3/
- Vite: https://vitejs.dev/

### Comandos Rápidos

```bash
# Backend
python manage.py makemigrations
python manage.py migrate
python manage.py shell
python manage.py createsuperuser

### Criar usuário de desenvolvimento automaticamente
Você pode ativar a criação automática de um usuário de desenvolvimento (e dados de demonstração) no container definindo:

```bash
# No ambiente local (exemplo)
export CREATE_DEV_USER=true
export DEV_SUPERUSER_USERNAME=admin
export DEV_SUPERUSER_EMAIL=admin@example.com
export DEV_SUPERUSER_PASSWORD=admin
# Para também criar dados de demo (fazendas/áreas)
export DEV_CREATE_DEMO_DATA=true
```

Se estiver usando Docker, certifique-se de que essas variáveis estejam disponíveis no container, **either** exportando-as antes de executar `docker-compose up` ou adicionando-as à seção `environment` do serviço de backend no arquivo `docker-compose.yml`.
Ao iniciar o backend com estas variáveis (ex.: `docker-compose up`), o entrypoint executará `python manage.py seed_dev` após as migrations, criando um superuser se não existir.

### Executar testes backend localmente (com Postgres via Docker)

Se quiser rodar os testes de backend localmente com um banco Postgres idêntico ao do CI, use o serviço `db` do docker-compose e então rode pytest apontando o `DATABASE_URL` para a porta mapeada no host (por padrão 5435):

```bash
# subir apenas o banco em background
docker compose up -d db

# exportar DATABASE_URL apontando para o DB mapeado no host
export DATABASE_URL=postgresql://agro_user:secret_password@localhost:5435/agro_db

# rodar os testes do app administrativo (exemplo)
pytest -q backend/apps/administrativo
```

Dica: se os testes reclamarem de migrações faltantes, rode `python manage.py migrate` no container do backend (ou localmente) antes de executar pytest.

# Frontend
npm install <package>
npm run build
npm run preview

# Git
git status
git log --oneline -10
git diff
git stash
git stash pop

# Sistema
ps aux | grep python    # Ver processos Python
ps aux | grep node      # Ver processos Node
kill -9 <PID>          # Matar processo
```

---

## ❓ FAQ

### P: Como adicionar novo tipo de operação?
**R:** 
1. Backend: Adicionar em `Operacao.TIPO_CHOICES` em `models.py`
2. Criar migração: `python manage.py makemigrations`
3. Aplicar: `python manage.py migrate`
4. Frontend: Recarregar tipos via API (automático)

### P: Como adicionar novo campo na operação?
**R:**
1. Backend: Adicionar campo em `models.py`
2. Atualizar serializer em `serializers.py`
3. Criar e aplicar migração
4. Frontend: Atualizar interface em `operacoes.ts`
5. Adicionar no wizard se necessário

### P: Como debugar erro 500?
**R:**
1. Ver logs: `tail -50 /tmp/django.log`
2. Identificar stack trace
3. Adicionar prints temporários
4. Usar `import pdb; pdb.set_trace()`

### P: Como limpar cache do frontend?
**R:**
```bash
# Matar processo
pkill -f vite

# Limpar cache
rm -rf frontend/.vite
rm -rf frontend/node_modules/.vite

# Reiniciar com --force
npm run dev -- --force --host 0.0.0.0 --port 5173
```

### P: Como fazer merge para main?
**R:**
1. Garantir que tudo está commitado
2. Push da branch: `git push origin refactor-operacoes`
3. Criar Pull Request no GitHub
4. Revisar mudanças
5. Merge quando aprovado

---

## 🎯 Tarefas Prioritárias (Próximas 2-4 Semanas)

### Semana 1: Financeiro - Livro Caixa
- [ ] Backend: Criar modelo `ContaBancaria` em `financeiro/models.py`
- [ ] Backend: Criar modelo `MovimentacaoBancaria` (débito/crédito)
- [ ] Backend: API endpoints para CRUD contas e movimentações
- [ ] Backend: Lógica de conciliação automática
- [ ] Frontend: Página `ContasBancariasList` e `ContaBancariaForm`
- [ ] Frontend: Integração com Vencimentos (pagamentos automáticos)

### Semana 2: Financeiro - Unificar Créditos
- [ ] Backend: Refatorar `Financiamento` e `Emprestimo` para herança comum
- [ ] Backend: Campo `tipo_credito` (financiamento/emprestimo)
- [ ] Backend: Serializer único com campos condicionais
- [ ] Frontend: Componente `CreditoForm` único
- [ ] Frontend: Atualizar listas para mostrar ambos os tipos

### Semana 3: Comercial - Integração Estoque
- [ ] Backend: Adicionar `local_armazenamento` em `Venda` e `Compra`
- [ ] Backend: Signals para criar movimentações automáticas
- [ ] Backend: Controle de lotes por fornecedor
- [ ] Frontend: Campo local de armazenamento nos forms
- [ ] Frontend: Dashboard estoque por fornecedor

### Semana 4: UI/UX Melhorias
- [ ] Frontend: Padronizar cores/tipografia global
- [ ] Frontend: Componentes comuns (Button, Modal, etc.)
- [ ] Frontend: Dashboards com gráficos Chart.js
- [ ] Frontend: Responsividade mobile completa
- [ ] Testes: Playwright para fluxos críticos

---

## 🎯 Checklist Antes de Começar

- [ ] Li [CONTEXTO_PROJETO.md](./CONTEXTO_PROJETO.md)
- [ ] Li [FASE_ATUAL.md](./FASE_ATUAL.md)
- [ ] Backend rodando (porta 8000)
- [ ] Frontend rodando (porta 5173)
- [ ] Consigo acessar http://localhost:5173
- [ ] Consigo criar uma operação
- [ ] Git na branch `refactor-operacoes`
- [ ] Entendo o que preciso fazer
- [ ] Sei onde está o código relevante

**Se todos checkboxes ✅ → Pronto para começar! 🚀**

---

**Boa sorte! Qualquer dúvida, consulte a documentação ou os arquivos de código.**

**Dica final:** Commits pequenos e frequentes > Commits grandes e raros
