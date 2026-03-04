# NOTA FISCAL — Operação: "Refletir Fornecedor"

**Resumo:**
Documenta a especificação da nova operação "Refletir Fornecedor" que cria ou atualiza um registro em `Fornecedor` a partir dos dados de uma NFe manifestada e confirmada. O escopo é estritamente limitado à operação Nota Fiscal → Refletir Fornecedor (sem fuzzy matching, sem alterações em outras áreas fora do escopo).

---

## 1. Escopo e objetivo
- Escopo: somente a operação de Nota Fiscal denominada **Refletir Fornecedor**.
- Objetivo: permitir que uma NFe manifestada e confirmada gere ou atualize um registro em `Fornecedor` com dados extraídos da NFe, com controle de tipo `force` (sobrescrever ou não).
- Localização do documento: `docs/04-Modulos/Fiscal/NOTA_FISCAL_REFLETIR_FORNECEDOR.md` (conforme política de documentação).

---

## 2. Fluxo end-to-end (resumo)
1. Usuário abre a **modal de edição da NFe** (`NfeEditModal`) e edita dados do fornecedor (ex.: `nome`, `cnpj` se disponível).
2. Usuário clica no botão **Refletir nos fornecedores**.
3. Frontend envia `POST /api/fiscal/notas/{id}/reflect_fornecedor/` com payload `{ "force": true|false }`.
4. Backend executa serviço transacional que valida precondições (NFe manifestada + confirmada) e executa `get_or_create`/`update` em `Fornecedor` usando prioridade de combinação por `cnpj` (quando presente) ou `nome`.
5. Backend retorna JSON com resultado `{ fornecedor_id, created, updated, fornecedor }` e mensagem apropriada.
6. Frontend exibe feedback; se sucesso, atualiza view de fornecedores localmente (ou instruir o usuário a navegar até `Comercial → Fornecedores`).

---

## 3. Regras de negócio
- Operação permitida apenas para NFes com estado: **manifestada** E **confirmada**.  
- Matching:
  - 1º critério: `cnpj` (quando presente) — o sistema usa índice por `cnpj` para busca rápida.
  - 2º critério: `nome` exato (sem fuzzy matching nesta primeira fase).
- Comportamento `force`:
  - `force=false` (padrão): se fornecedor existente tiver dados divergentes, retornar `{ conflict: true }` sem sobrescrever; incluir payload de diff no response para UI poder exibir confirmação.
  - `force=true`: sobrescrever os campos definidos no fornecedor com os valores vindos da NFe.
- Auditoria mínima: registrar `updated_by`/`updated_at` se campos do fornecedor forem atualizados (reusar campos existentes ou logger se não houver model fields).
- Permissões: usuário precisa de `fiscal.change_nfe` e de `comercial.add_fornecedor`/`comercial.change_fornecedor` para criar/alterar.

---

## 4. Contrato de API (proposta)
Endpoint:
```
POST /api/fiscal/notas/{id}/reflect_fornecedor/
Content-Type: application/json
Authorization: Bearer <token>
```
Request body (opcional):
```json
{ "force": false }
```
Responses:
- 200 OK
```json
{
  "fornecedor_id": 123,
  "created": true|false,
  "updated": true|false,
  "conflict": false,
  "fornecedor": { /* objeto serializado de Fornecedor */ }
}
```
- 400 Bad Request — NFe inválida ou dados ausentes
- 403 Forbidden — sem permissão
- 409 Conflict — fornecedor existente com dados divergentes (quando `force=false`, `conflict=true` no 200 também é aceitável)

Observação: usar `comercial.serializers.FornecedorSerializer` para formato de resposta.

---

## 5. Serviço backend proposto
Assinatura sugerida (pseudocódigo):
```python
def reflect_fornecedor_from_nfe(nfe: NFe, user: User, force: bool=False) -> Tuple[Fornecedor, bool created, bool updated, Optional[dict] diff]
```
Comportamento:
- Verifica `nfe.manifestada` e `nfe.confirmada`.
- Extrai dados de fornecedor da NFe (`cnpj`, `nome`, `endereco`, `contato` quando disponíveis).
- Busca `Fornecedor` por `cnpj` (se disponível) ou por `nome`.
- Se não existir → cria (return created=True).
- Se existir e houver diferenças:
  - se `force=False` → retorna `conflict=True` com `diff`.
  - se `force=True` → atualiza campos e registra `updated=True`.
- Operação executada dentro de `transaction.atomic()`.

---

## 6. Tabelas e operações do banco de dados
- `apps_fiscal_nfe` — leitura de NFe e campos de fornecedor (campos brutos ou FK `fornecedor`).
- `apps_comercial_fornecedor` — alvo de `INSERT`/`UPDATE`.
- Operações: SELECT (NFe), SELECT/INSERT/UPDATE (Fornecedor). Index em `cnpj` utilizado. Tudo em transação.

---

## 7. Testes (TDD minimalista)
Criar exatamente 1 teste inicial em `apps/fiscal/tests/test_reflect_fornecedor.py`:
- `test_reflect_fornecedor_creates_fornecedor_happy_path`:
  - Setup: criar NFe manifestada+confirmada com dados de fornecedor (`nome` e opcional `cnpj`).
  - Action: chamar a função de serviço diretamente (ou endpoint) com `force=True/False` conforme o cenário.
  - Assert: `Fornecedor.objects.filter(nome=...).exists()` e `created==True`.
- Asserts devem ser específicos (`assert fornecedor.nome == '...'`).

Notas: depois dessa implementação inicial, adicionar testes para conflict/update/permissions em próximas iterações (máx. 2 testes adicionais se necessário, seguindo `TEST_POLICY_CORE`).

---

## 8. Arquivos e alterações sugeridas
Backend:
- `apps/fiscal/services.py` — adicionar `reflect_fornecedor_from_nfe`
- `apps/fiscal/views.py` — adicionar `@action(detail=True) reflect_fornecedor`
- `apps/fiscal/tests/test_reflect_fornecedor.py` — teste unitário inicial
- `docs/05-APIs-e-Endpoints.md` — documentar novo endpoint
Frontend:
-- `frontend/src/components/fiscal/NfeEditModal.tsx` — campos de fornecedor e botão **Refletir nos fornecedores**
- `frontend/src/services/fiscal.ts` — adicionar `reflectFornecedor(nfeId, force)`
- Ajustes de UI: modal de confirmação em caso de conflito

---

## 9. Critérios de aceitação
- Criar fornecedor: NFe manifestada+confirmada → ao refletir, cria `Fornecedor` com dados da NFe (`created: true`).
- Atualizar fornecedor: com `force=true` → atualiza e retorna `updated: true`.
- Sem permissão → retorna 403.
- Teste unitário inicial passa.

---

## 10. Riscos e decisões adiadas
- Fuzzy matching e heurísticas de deduplicação: adiar (fora do escopo).
- Mapeamento completo de endereços/contatos: limitar inicialmente a `nome`/`cnpj`/campo `contato` simples.
- Auditoria avançada (modelo separado): adiar até necessidade real.

---

## 11. Próximo passo sugerido
- Implementar o **teste unitário inicial** (branch `feat/fiscal/reflect-fornecedor`) e, em seguida, implementar o serviço backend e o endpoint. Em seguida, por TDD, implementar a UI mínima para chamar o endpoint e exibir feedback.

---

*Documento gerado em 11/02/2026 — conforme `copilot-instructions.md` (documentação em `docs/` com arquivo semântico).*