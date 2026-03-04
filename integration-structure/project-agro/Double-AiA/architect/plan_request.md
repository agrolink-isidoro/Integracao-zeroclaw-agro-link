# Architect Plan Request

## Como usar
Solicite um plano de atividades para o architect com:

@architect /plan <descrição do objetivo>

O architect irá planejar as atividades, listar as tarefas e aguardar confirmação do usuário para acionar o implementer.

---

## Exemplo de fluxo
1. Usuário: @architect /plan "Quero criar uma nova API no módulo fazendas."
2. Architect: Planeja e apresenta as tarefas.
3. Usuário: Confirma o plano.
4. Architect: Cria requests para o implementer.

## ⚠️ ATENÇÃO: Estrutura do Projeto

Sempre use caminhos corretos baseados em `/home/felip/projeto-agro/sistema-agropecuario/`:

**Exemplo de plano correto:**
```markdown
### Tarefa 1: Criar endpoint no backend
Caminho: `/home/felip/projeto-agro/sistema-agropecuario/backend/apps/fazendas/views.py`

### Tarefa 2: Criar componente no frontend
Caminho: `/home/felip/projeto-agro/sistema-agropecuario/frontend/src/pages/fazendas/`
```

**❌ NUNCA planejar tarefas com caminhos como:**
- `/home/felip/projeto-agro/backend/` (duplicação!)
- `/home/felip/projeto-agro/frontend/` (duplicação!)

Veja `docs/PROJETO_ESTRUTURA.md` para detalhes completos.
