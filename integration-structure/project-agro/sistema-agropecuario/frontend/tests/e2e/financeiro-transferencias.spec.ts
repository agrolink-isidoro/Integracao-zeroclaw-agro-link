import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';

test.setTimeout(60000);

// Temporarily skip due to E2E flakiness and to allow quick merge to main. See issue #121
test('Fluxo: criar transferência PIX exige chaves e cria lançamentos', async ({ page }) => {
  const auth = await ensureLoggedInPage(page);

  // Create two contas via API
  const create1 = await page.request.post('/api/financeiro/contas/', { data: { banco: 'B1', agencia: '1', conta: '0001', saldo_inicial: 1000 }, headers: auth.headers });
  expect(create1.ok()).toBeTruthy();
  const conta1 = await create1.json();

  const create2 = await page.request.post('/api/financeiro/contas/', { data: { banco: 'B2', agencia: '2', conta: '0002', saldo_inicial: 200 }, headers: auth.headers });
  expect(create2.ok()).toBeTruthy();
  const conta2 = await create2.json();

  // Navigate to financeiro -> Contas Bancárias -> Transferências
  await page.goto((auth.base ?? '') + '/financeiro');
  await page.waitForSelector('h1:has-text("Financeiro")');
  await page.click('.nav-tabs button:has-text("Contas Bancárias")');
  await page.waitForSelector('.nav-pills', { timeout: 5000 });
  await page.click('.nav-pills button:has-text("Transferências")');
  await page.waitForSelector('h5:has-text("Transferências")', { timeout: 5000 });

  // Open transfer modal
  await page.click('button:has-text("Nova Transferência")');
  await page.waitForSelector('h5:has-text("Nova Transferência")');

  // Select type PIX first, then contas. PIX makes conta_destino optional.
  await page.selectOption('select[name="tipo"]', 'pix');
  await page.selectOption('select[name="conta_origem"]', String(conta1.id)).catch(()=>{});
  // For PIX, conta_destino is optional — select it to also test entrada lancamento
  await page.selectOption('select[name="conta_destino"]', String(conta2.id)).catch(()=>{});

  // Fill valor
  await page.fill('input[placeholder="Valor"]', '50.00').catch(()=>{});

  // Click submit
  await page.click('button:has-text("Enviar Transferência")');

  // Expect validation error messages inside modal
  await expect(page.locator('text=Chave PIX de origem obrigatória')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('text=Chave PIX de destino obrigatória')).toBeVisible({ timeout: 2000 });

  // Fill pix keys and submit
  await page.fill('input[placeholder="Chave PIX Origem"]', 'chaveA').catch(()=>{});
  await page.fill('input[placeholder="Chave PIX Destino"]', 'chaveB').catch(()=>{});

  // Intercept POST
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/financeiro/transferencias/') && r.request().method() === 'POST'),
    page.click('button:has-text("Enviar Transferência")')
  ]);

  expect(resp.ok()).toBeTruthy();
  const transfer = await resp.json();
  expect(transfer.tipo_transferencia).toBe('pix');
  expect(transfer.pix_key_origem).toBe('chaveA');
  expect(transfer.pix_key_destino).toBe('chaveB');

  // Confirm lancamentos were created: one saida in conta1 and one entrada in conta2
  const l1 = await page.request.get(`/api/financeiro/lancamentos/?conta=${conta1.id}`, { headers: auth.headers });
  expect(l1.ok()).toBeTruthy();
  const lancs1 = await l1.json();
  const hasSaida = lancs1.results.some((l:any) => l.tipo === 'saida' && Number(l.valor) === 50.00);
  expect(hasSaida).toBeTruthy();

  const l2 = await page.request.get(`/api/financeiro/lancamentos/?conta=${conta2.id}`, { headers: auth.headers });
  expect(l2.ok()).toBeTruthy();
  const lancs2 = await l2.json();
  const hasEntrada = lancs2.results.some((l:any) => l.tipo === 'entrada' && Number(l.valor) === 50.00);
  expect(hasEntrada).toBeTruthy();
});
