import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

/**
 * Helper: login as admin and navigate away from the login page.
 * Uses waitForURL instead of waitForNavigation for stability.
 */
async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  // Wait until we leave the login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test('user can create fornecedor via UI', async ({ page }) => {
  // ── 1. Login ──────────────────────────────────────────────
  await login(page);

  // Capture auth headers for API verification later
  const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('tokens') || '{}'));
  const headers = { Authorization: `Bearer ${tokens.access}` };

  // ── 2. Navigate to fornecedores ───────────────────────────
  await page.goto(`${BASE}/comercial/fornecedores`);
  await page.waitForSelector('h2:has-text("Fornecedores")');

  // ── 3. Open "Novo Fornecedor" modal ───────────────────────
  await page.click('button:has-text("Novo Fornecedor")');

  // ── 4. Tab: Dados Gerais ──────────────────────────────────
  const unique = Date.now();
  const cpfCnpj = `88.888.${String(unique).slice(-3).padStart(3, '0')}/0001-88`;
  await page.fill('input[name="cpf_cnpj"]', cpfCnpj);
  await page.fill('input[name="razao_social"]', 'UI Test Ltda');

  // ── 5. Tab: Endereço ──────────────────────────────────────
  await page.click('button:has-text("Endereço")');
  await page.fill('input[name="endereco.logradouro"]', 'Rua Playwright');
  await page.fill('input[name="endereco.numero"]', '42');
  await page.fill('input[name="endereco.bairro"]', 'Centro');
  await page.fill('input[name="endereco.cidade"]', 'TestCity');
  // Estado dropdown with testId
  await page.click('[data-testid="estado-select"]');
  await page.click('[data-testid="estado-select-option-SP"]');
  await page.fill('input[name="endereco.cep"]', '00000-000');

  // ── 6. Tab: Contato ───────────────────────────────────────
  await page.click('button:has-text("Contato")');
  await page.fill('input[name="contato.telefone_principal"]', '11900000000');
  await page.fill('input[name="contato.email_principal"]', 'playwright@test.com');

  // ── 7. Tab: Dados Bancários ───────────────────────────────
  await page.click('button:has-text("Dados Bancários")');

  // 7a. Select Banco — pick the first available option
  await page.click('[data-testid="fornecedor-banco-select"]');
  const bancoOverlay = page.locator('[data-testid="fornecedor-banco-select"] .absolute.z-10');
  const bancoOpts = bancoOverlay.locator('div.px-3.py-2');
  let selectedBankName: string | null = null;
  if (await bancoOpts.count() > 0) {
    selectedBankName = (await bancoOpts.first().textContent())?.trim() ?? null;
    await bancoOpts.first().click();
  } else {
    // No banks available — close overlay and continue without banco
    await page.keyboard.press('Escape');
  }

  // 7b. Select Tipo de Chave PIX → CPF (using testId)
  await page.click('[data-testid="fornecedor-tipo-chave-pix-select"]');
  await page.click('[data-testid="fornecedor-tipo-chave-pix-select-option-cpf"]');

  // 7c. Fill Chave PIX and trigger onBlur formatting
  const chavePix = page.locator('input[name="dados_bancarios.chave_pix"]');
  await chavePix.fill('12345678901');
  await chavePix.blur();
  // Wait briefly for onBlur formatting to apply
  await page.waitForTimeout(500);

  // ── 8. Submit form ────────────────────────────────────────
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().includes('/api/comercial/fornecedores/') && r.method() === 'POST'),
    page.click('button[type="submit"]'),
  ]);

  const resp = await req.response();
  const status = resp ? resp.status() : null;
  const body = resp ? await resp.json() : null;

  // ── 9. Assertions on response ─────────────────────────────
  expect(status).toBe(201);
  expect(body).toHaveProperty('id');
  expect(body.razao_social).toContain('UI Test Ltda');

  // ── 10. Wait for modal to close (indicating success + list reload) ─
  // The form modal disappears after successful create + refetch
  await page.waitForSelector('button:has-text("Novo Fornecedor")', { timeout: 10000 });
  // Give the table a moment to re-render with fresh data
  await page.waitForTimeout(1000);

  // ── 11. Verify row appears in the table ───────────────────
  const row = page.locator(`tr:has-text("${cpfCnpj}")`);
  // If the newly created row isn't visible (pagination), just verify via API response
  const rowVisible = await row.isVisible().catch(() => false);
  if (rowVisible) {
    await expect(row.locator('button[title="Editar"]')).toBeVisible();
  }

  // ── 12. Verify persisted bank/PIX data ────────────────────
  const created = body;
  expect(created).not.toBeNull();

  if (selectedBankName) {
    // Strip bacen code from option label for comparison
    const normalized = (selectedBankName || '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();
    expect((created.dados_bancarios?.banco || '').toLowerCase()).toContain(normalized);
  }

  // PIX key should be CPF-formatted (tipo_chave_pix = "cpf")
  expect(created.dados_bancarios?.tipo_chave_pix).toBe('cpf');
  expect(created.dados_bancarios?.chave_pix).toBe('123.456.789-01');
});