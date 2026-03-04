# Playwright E2E tests

The project includes a smoke E2E test for the Financeiro flow located at `tests/e2e/financeiro.spec.ts`.

To run E2E tests locally:

1. Install dev dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install`
3. Run tests: `npm run test:e2e`

Note: the Playwright tests mock API responses and require the Playwright dev dependency to be present. If you see TypeScript diagnostics in your editor for the E2E file, make sure the `@playwright/test` package is installed or open the file with `// @ts-nocheck` present (already added to the test file).