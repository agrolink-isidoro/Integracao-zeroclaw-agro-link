# React + TypeScript + Vite

**Nota:** para instruções e políticas sobre execução local de workflows pesados com `act` (quando reproduzir o CI é necessário), consulte `docs/CI/ACT_POLICY.md`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Manifestação (front-end)
- Componente: `src/components/fiscal/ManifestacaoNota.tsx` — implementa interação básica para manifestação (dropdown + modal quando requer motivo) e exibe **toasts** ao usuário para sucesso, enfileiramento (enqueued) e erro.
  - Observação de contrato: a API retorna um campo `enqueued` (boolean) indicando se o envio à SEFAZ foi enfileirado; em erros de validação (`400`) o backend devolve `bad_fields` que devem ser mapeados para os campos do formulário no cliente para exibição inline.
- Tests:
  - Unitários: `src/components/fiscal/__tests__/ManifestacaoNota.test.tsx` (verifica comportamento e toasts)
  - E2E: `sistema-agropecuario/frontend/tests/e2e/manifestacao-enqueued.spec.ts` (Playwright)
- Rodando o E2E localmente:
  1. Certifique-se que o backend e o frontend estão rodando (`npm run dev`, `docker compose up -d backend` etc.).
  2. Execute:
     `PLAYWRIGHT_BASE_URL=http://localhost:5173 VITE_FISCAL_MANIFESTACAO_ENABLED=true npx playwright test sistema-agropecuario/frontend/tests/e2e/manifestacao-enqueued.spec.ts -q`

> Dica: habilite `VITE_FISCAL_MANIFESTACAO_ENABLED=true` para incluir o componente no build quando estiver testando esse fluxo.
