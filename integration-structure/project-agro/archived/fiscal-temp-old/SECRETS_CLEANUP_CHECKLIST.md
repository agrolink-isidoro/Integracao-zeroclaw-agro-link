# Checklist: Remoção de Secrets Relacionados a Testes de Assinatura

Quando decidirmos não usar GitHub Actions para executar testes que exigem um `.pfx`, siga estes passos para remover secrets do repositório e reduzir risco:

1. Acesse o repositório no GitHub → *Settings* → *Secrets and variables* → *Actions*.
2. Localize e remova as entradas que não serão usadas:
   - `FISCAL_TEST_PFX_BASE64`
   - `FISCAL_TEST_PFX_PASS`
3. (Opcional via CLI) — usando `gh` CLI (GitHub CLI):
   - `gh secret list --repo <owner>/<repo>` — verificar lista
   - `gh secret delete FISCAL_TEST_PFX_BASE64 --repo <owner>/<repo>`
   - `gh secret delete FISCAL_TEST_PFX_PASS --repo <owner>/<repo>`
4. Atualize a documentação local (`docs/FISCAL_TEMP/TEST_CERT_GENERATION.md`) para indicar que os secrets foram removidos e que a validação deve ser feita via container local.
5. (Opcional) Comunique a equipe e registre a mudança no `CHANGELOG.md` e/ou em um comentário no PR associado, indicando o motivo (economia de billing / segurança).

Observação: Caso os secrets sejam necessários no futuro, recomendo:
- Criar um processo de aprovação para uso de secrets de teste
- Preferir runner self-hosted com acesso controlado
- Usar secrets curtos e rotacionáveis

Se desejar, eu executo os passos 2-3 para você e confirmo quando estiver concluído.