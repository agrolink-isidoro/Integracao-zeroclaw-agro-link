**Fake NFe Sequence**: Script and usage

- **Purpose**: cria uma sequência controlada de NF-e para testes. Cada NF-e contém exatamente 2 itens: um item comum compartilhado entre as notas e um item único por nota. Útil para validar comportamento de consolidação, overrides e reflexões de estoque.

- **Local do script**: `backend/apps/fiscal/management/commands/create_fake_nfes_sequence.py`

- **Comportamento**:
  - Por padrão cria 5 NFes (use `--count` para alterar).
  - Cada NFe tem:
    - Item 1: `codigo=COMMON-001` (reaproveitado entre NFes).
    - Item 2: `codigo=UNIQ-XXX` (único para a nota, XXX sequencial).
  - Mantém consistência com o gerador `create_fake_nfes` (fornecedor/emitente, campos mínimos preenchidos).

- **Como executar** (a partir de `sistema-agropecuario/`):

```bash
docker compose exec -T backend python manage.py create_fake_nfes_sequence --count 5
```

- **Observações**:
  - O comando criado é um wrapper independente; preferimos este formato para garantir controle exato dos códigos dos produtos (itens comuns e únicos).
  - Documentação adicionada em `docs/fiscal/FAKE_NFE_SEQUENCE.md` conforme política de documentação (somente em `docs/`).
