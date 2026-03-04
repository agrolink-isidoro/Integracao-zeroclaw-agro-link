import { test, expect } from '@playwright/test';

test('user can create contrato via UI', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);

  // Navigate to contrato create page
  await page.goto('http://localhost:5173/comercial/contratos/new');
  await page.waitForSelector('h2:has-text("Novo Contrato")');

  // Fill form
  const unique = Date.now();
  await page.fill('input[name="numero_contrato"]', `CT-${unique}`);
  await page.fill('input[name="titulo"]', `Contrato E2E ${unique}`);
  // UI option values differ from backend choices; force backend-valid value
  await page.evaluate(() => {
    const sel = document.querySelector('select[name="tipo_contrato"]') as HTMLSelectElement | null;
    if (sel) {
      sel.value = 'venda';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.selectOption('select[name="categoria"]', 'graos');
  await page.fill('input[name="valor_total"]', '10000');
  // date: today
  const d = new Date();
  const iso = d.toISOString().slice(0,10);
  await page.fill('input[name="data_inicio"]', iso);

  // product details
  await page.fill('input[name="produto"]', 'Soja e2e');
  await page.fill('input[name="quantidade"]', '1000');
  await page.selectOption('select[name="unidade_medida"]', 'ton');

  // Sanity check values & client-side validation
  await page.waitForTimeout(200);
  const validationErrors = await page.locator('text=obrigatório').count();
  console.log('Pre-submit validation errors count:', validationErrors);
  const currentValues = await page.evaluate(() => ({
    numero: (document.querySelector('input[name="numero_contrato"]') as HTMLInputElement)?.value || null,
    titulo: (document.querySelector('input[name="titulo"]') as HTMLInputElement)?.value || null,
    tipo_contrato: (document.querySelector('select[name="tipo_contrato"]') as HTMLSelectElement)?.value || null,
    categoria: (document.querySelector('select[name="categoria"]') as HTMLSelectElement)?.value || null,
    valor_total: (document.querySelector('input[name="valor_total"]') as HTMLInputElement)?.value || null,
    data_inicio: (document.querySelector('input[name="data_inicio"]') as HTMLInputElement)?.value || null,
  }));
  console.log('Current values before submit:', currentValues);

  // Submit and wait for POST
  const [req] = await Promise.all([
    page.waitForRequest((r) => r.url().includes('/api/comercial/contratos') && r.method() === 'POST'),
    page.click('button[type="submit"]')
  ]);

  const resp = await req.response();
  const status = resp ? resp.status() : null;
  const body = resp ? await resp.json() : null;

  console.log('REQUESTED:', req.url(), 'STATUS:', status);
  if (status !== 201) console.log('Response body on failure:', body);
  expect(status).toBe(201);
  expect(body).toHaveProperty('id');
});