# COPILOT Instructions — Applied Changes (summary)

Date: 2025-12-25

This file summarises the initial, automated changes applied to the repository to start aligning code with `.github/copilot-instructions.md` and `.github/copilot-instructions-frontend.md`.

Applied so far:

- Created feature branch `chore/apply-copilot-instructions`.
- Added frontend hooks scaffolding:
  - `frontend/src/hooks/useAuth.ts` — central token storage and refresh helper.
  - `frontend/src/hooks/useApi.ts` — small wrapper exposing the configured API client.
- Added a small Jest test: `frontend/src/__tests__/useAuth.test.tsx`.

Next recommended steps (planned in TODO list):

1. Integrate `useAuth` into `frontend/src/services/api.ts` and components that perform auth operations.
2. Add more tests and CI steps (lint, unit, integration) as required by instructions.
3. Apply similar scaffolding patterns to backend (docs, settings checks, testing scaffolds).
4. Open a PR from `chore/apply-copilot-instructions` for review.

If you want, I can continue and: run the frontend tests locally, integrate the hooks into existing auth flow, and update README/CONTRIBUTING with the enforced rules.

---

## 2025-12-28 — Additional notes
- Fixed multiple frontend TypeScript and build errors (e.g., stray normalization block in `produtos.ts`).
- Added first working dashboards integrating Financeiro (Despesas/Rateios), Fiscal (NFes) and a simple Administrativo Centers block.
- Frontend production build successful and test suite is green locally.
