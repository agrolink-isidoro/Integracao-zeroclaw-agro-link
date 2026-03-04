import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test('FluxoCaixa: verify visualization and filters', async ({ page }) => {
  const { ensureLoggedInPage } = await import('./helpers');
  const auth = await ensureLoggedInPage(page);

  await page.goto((auth.base ?? '') + '/financeiro');
  await page.waitForSelector('h1:has-text("Financeiro")');

  // Click Fluxo de Caixa tab
  await page.click('.nav-tabs button:has-text("Fluxo de Caixa")');
  await page.waitForSelector('h5:has-text("Fluxo de Caixa")', { timeout: 5000 });

  // Verify filters are present
  await expect(page.locator('label:has-text("Ano")')).toBeVisible();
  await expect(page.locator('label:has-text("Centro de Custo")')).toBeVisible();
  await expect(page.locator('label:has-text("Visualização")')).toBeVisible();

  // Verify summary cards
  await expect(page.locator('h6:has-text("Receitas Totais")')).toBeVisible();
  await expect(page.locator('h6:has-text("Despesas Totais")')).toBeVisible();
  await expect(page.locator('h6:has-text("Saldo")')).toBeVisible();

  // Default view should be mensal
  await expect(page.locator('h5:has-text("Fluxo de Caixa Mensal")')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('th:has-text("Mês")')).toBeVisible();
  await expect(page.locator('th:has-text("Receitas")')).toBeVisible();
  await expect(page.locator('th:has-text("Despesas")')).toBeVisible();

  // Switch to anual view (select the third select which is "Visualização")
  const visualizacaoSelect = page.locator('label:has-text("Visualização")').locator('..').locator('select');
  await visualizacaoSelect.selectOption({ label: 'Anual (Totais)' });
  await expect(page.locator('h5:has-text("Totais Anuais")')).toBeVisible();
  await expect(page.locator('h6:has-text("Receita Bruta")')).toBeVisible();
  await expect(page.locator('h6:has-text("Despesa Bruta")')).toBeVisible();
  await expect(page.locator('h6:has-text("Resultado Líquido")')).toBeVisible();

  // Switch back to mensal
  await visualizacaoSelect.selectOption({ label: 'Mensal' });
  await expect(page.locator('h5:has-text("Fluxo de Caixa Mensal")')).toBeVisible();

  // Test clear filters
  await page.click('button:has-text("Limpar")');
  await expect(page.locator('h5:has-text("Fluxo de Caixa Mensal")')).toBeVisible();
});
