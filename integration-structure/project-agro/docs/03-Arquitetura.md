# 03 - Arquitetura

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — infra e propagação de tenant em backend e frontend (veja `backend/apps/core` e `frontend/src/contexts/TenantContext.tsx`).
- **RBAC:** Implementação e testes E2E para RBAC concluídos; ver `docs/archived/USER_MANAGEMENT/` para detalhes de execução.
- **Principais pendências:** Consolidar enforcement automático de permissões em todas as views (alguns pontos já corrigidos, revisar `core/mixins.py`).

**Última Revisão:** Março 2026
**Links Relacionados:** [01-Visao-Geral.md](01-Visao-Geral.md) | [05-APIs-e-Endpoints.md](05-APIs-e-Endpoints.md) | [08-Integracoes-e-Relacionamentos.md](08-Integracoes-e-Relacionamentos.md)

## 🏗️ Arquitetura Geral

### Stack Tecnológico
- **Backend:** Django 4.2.16 + DRF, PostgreSQL/PostGIS, Redis, Celery (planejado).
- **Frontend:** React 18 + TypeScript, Vite, Bootstrap/Tailwind.
- **Outros:** Docker, JWT, Axios/React Query.

### Padrões
- **APIs:** RESTful, versionadas em /api/.
- **Autenticação:** JWT stateless.
- **Estado:** React Query para caching.
- **Banco:** ORM Django, PostGIS para GIS.

## 📈 Diagrama de Arquitetura

```mermaid
graph TD
    %% Back-end Modules (Django Apps)
    subgraph "Back-end (Django)"
        core[Core<br/>Users, Auth, RBAC (documentado)]
        administrativo[Administrativo<br/>Funcionários, Centros de Custo, Folha]
        financeiro[Financeiro<br/>Rateios, Vencimentos, Financiamentos, Transferências]
        comercial[Comercial<br/>Empresas, Contratos, Compras/Vendas]
        agricultura[Agricultura<br/>Culturas, Safras, Operações]
        estoque[Estoque<br/>Produtos, Movimentações]
        fazendas[Fazendas<br/>Proprietários, Áreas, Talhões]
        maquinas[Máquinas<br/>Equipamentos, Abastecimentos]
        fiscal[Fiscal<br/>Certificados, NFEs, Manifestações]
        i18n[I18n<br/>Languages]
    end

    %% Front-end Pages/Components
    subgraph "Front-end (React/Vite)"
        Dashboard[Dashboard<br/>Overview]
        AdminPage[Administrativo<br/>Funcionários, Centros, Folha]
        FinancePage[Financeiro<br/>Rateios, Vencimentos, Dashboard, Transferências]
        CommercialPage[Comercial<br/>Empresas, Fornecedores, Contratos]
        AgPage[Agricultura<br/>Culturas, Operações, Colheitas]
        StockPage[Estoque<br/>Produtos, Movimentações]
        FarmPage[Fazendas<br/>Proprietários, Áreas, Talhões]
        MachinePage[Máquinas<br/>Equipamentos, Manutenção]
        FiscalPage[Fiscal<br/>Certificados, NFEs]
        UserManagement[UserManagement<br/>RBAC Interface (planejado)]
        Auth[Auth<br/>Login/Register]
    end

    %% API Connections (via Axios/React Query)
    Auth -->|"JWT Auth"| core
    UserManagement -->|"RBAC CRUD"| core
    Dashboard -->|"Health, Resumos"| core
    AdminPage -->|"CRUD Funcionários, Centros, Folha"| administrativo
    FinancePage -->|"CRUD Rateios, Vencimentos, Financiamentos, Transferências"| financeiro
    CommercialPage -->|"CRUD Empresas, Contratos, Compras/Vendas"| comercial
    AgPage -->|"CRUD Culturas, Operações, Colheitas"| agricultura
    StockPage -->|"CRUD Produtos, Movimentações"| estoque
    FarmPage -->|"CRUD Proprietários, Áreas, Talhões"| fazendas
    MachinePage -->|"CRUD Equipamentos, Abastecimentos"| maquinas
    FiscalPage -->|"CRUD Certificados, NFEs"| fiscal

    %% Inter-modular Relationships
    administrativo -->|"Rateios de Custos (Folha)"| financeiro
    financeiro -->|"Rateios Aprovados"| administrativo
    comercial -->|"Despesas Prestadoras"| financeiro
    agricultura -->|"Operações (Custos)"| financeiro
    maquinas -->|"Abastecimentos, Manutenção"| financeiro
    estoque -->|"Movimentações (Custos)"| financeiro
    fazendas -->|"Áreas/Talhões (Rateios)"| financeiro
    fiscal -->|"NFEs (Impostos)"| administrativo
    fiscal -->|"NFEs (Fornecedores)"| comercial
    fiscal -->|"NFEs (Movimentação->Entrada->Produto)"| estoque
    fiscal -->|"NFEs (Despesa->Vencimento)"| financeiro 

    %% Database and External
    db[(PostGIS<br/>PostgreSQL)] -->|"ORM"| administrativo
    db -->|"ORM"| financeiro
    db -->|"ORM"| comercial
    db -->|"ORM"| agricultura
    db -->|"ORM"| estoque
    db -->|"ORM"| fazendas
    db -->|"ORM"| maquinas
    db -->|"ORM"| fiscal
    redis[(Redis<br/>Cache)] -->|"Sessions, Cache"| core

    %% RBAC Permissions (documentado, não implementado)
    rbac[RBAC System<br/>ModulePermission Model<br/>7 Hierarchical Roles<br/>(documentado)] -->|"Enforce (planejado)"| core
    rbac -->|"Permissions"| administrativo
    rbac -->|"Permissions"| financeiro
    rbac -->|"Permissions"| comercial
    rbac -->|"Permissions"| agricultura
    rbac -->|"Permissions"| estoque
    rbac -->|"Permissions"| fazendas
    rbac -->|"Permissions"| maquinas
    rbac -->|"Permissions"| fiscal

    %% Notes
    note1["Nota: APIs via /api/ prefix<br/>Autenticação JWT<br/>React Query para state management<br/>RBAC documentado (não implementado)"]
    note2["Nota: Relacionamentos inter-modulares<br/>principalmente via financeiro<br/>para rateios e aprovações<br/>RBAC planejado para controle de acesso"]
```

## 🔧 Componentes Detalhados

### Backend Apps
- **Core:** Autenticação, usuários, health checks.
- **Administrativo:** Gestão de pessoal e custos administrativos.
- **Financeiro:** Hub de rateios e finanças.
- **Outros:** Ver [04-Modulos/](04-Modulos/) para detalhes.

### Frontend Estrutura
- **Páginas:** Organizadas por módulo em src/pages/.
- **Hooks:** Custom em src/hooks/ (useApi, useApiQuery).
- **Componentes:** Reutilizáveis em src/components/.

## � Sistema RBAC (Status: Documentado)

### Estado Atual
- **Modelo:** `ModulePermission` criado com campos (user, module, can_view, can_edit, can_respond)
- **APIs:** Endpoints CRUD para ModulePermission implementados
- **Perfis:** 7 perfis hierárquicos documentados (Funcionário Temporário → Proprietário)
- **Middleware:** Não implementado (planejado para enforcement automático)
- **Interface:** UserManagement documentado mas não implementado no frontend
- **Aplicação:** Permissões não são verificadas nas views dos módulos

### Implementação Pendente
- Middleware Django para verificar permissões por módulo
- Interface UserManagement completa no frontend
- Aplicação de permissões nas views existentes
- Testes de integração para controle de acesso

## �📋 Próximos Passos
Para APIs, veja [05-APIs-e-Endpoints.md](05-APIs-e-Endpoints.md).</content>
<parameter name="filePath">/home/felip/projeto-agro/docs/03-Arquitetura.md