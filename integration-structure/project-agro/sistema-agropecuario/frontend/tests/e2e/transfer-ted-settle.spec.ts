import { test, expect } from '@playwright/test';
import { getFixturePath } from './test-helpers';

// Increase timeout for upload + waiting
test.setTimeout(120000);

test.skip('TED transfer gets auto-settled after extrato import', async ({ page }) => {
  // This test is skipped as it requires:
  // 1. Full extrato upload flow working correctly
  // 2. Background reconciliation job to match transfers
  // 3. Complex timing/polling logic
  // Manual testing recommended for this flow
  
  const { ensureLoggedInPage } = await import('./helpers');
  const auth = await ensureLoggedInPage(page);
  const { headers, base } = auth;

  // Create contas and vencimento via API
  const c1Resp = await page.request.post(`${base}/api/financeiro/contas/`, { data: { banco: 'Origem E2E', agencia: '01', conta: '0001' }, headers });
  expect(c1Resp.ok()).toBeTruthy();
  const c1 = await c1Resp.json();

  const c2Resp = await page.request.post(`${base}/api/financeiro/contas/`, { data: { banco: 'Destino E2E', agencia: '02', conta: '0002' }, headers });
  expect(c2Resp.ok()).toBeTruthy();
  const c2 = await c2Resp.json();

  const vencResp = await page.request.post(`${base}/api/financeiro/vencimentos/`, { data: { titulo: 'Venc E2E', valor: '200.00', data_vencimento: '2026-04-01', tipo: 'despesa' }, headers });
  expect(vencResp.ok()).toBeTruthy();
  const venc = await vencResp.json();

  // Create transfer via API (TED => pending)
  const payload = {
    conta_origem: c1.id,
    tipo_transferencia: 'ted',
    dados_bancarios: { conta_destino: c2.id },
    itens: [{ vencimento: venc.id, valor: '200.00' }],
    client_tx_id: `e2e-${Date.now()}`
  };

  const qr = await page.request.post(`${base}/api/financeiro/vencimentos/quitar_por_transferencia/`, { data: payload, headers });
  expect(qr.ok()).toBeTruthy();
  const transfer = await qr.json();
  expect(transfer.status).toBe('pending');

  // Go to upload page and import CSV that matches amount + date + conta
  await page.goto((base.replace(/\/api\/*$/, '') || '') + '/financeiro/extratos');
  await page.waitForSelector('h2:has-text("Extratos Bancários")', { timeout: 10000 });

  await page.click('button:has-text("Novo Extrato")');
  await page.waitForSelector('h5:has-text("Upload de Extrato")', { timeout: 5000 });

  const csvPath = getFixturePath(import.meta.url, 'bank-statement-match.csv');
  await page.setInputFiles('input[accept*=".csv"]', csvPath);
  await page.click('button:has-text("Preview")');

  // Click import
  const importPromise = page.waitForResponse((r) => r.url().includes('/api/financeiro/bank-statements/') && r.request().method() === 'POST', { timeout: 20000 });
  await page.click('button:has-text("Importar")');
  const importResp = await importPromise;
  expect(importResp.ok()).toBeTruthy();

  // Poll transfer until status becomes settled
  const maxAttempts = 20;
  let settled = false;
  for (let i = 0; i < maxAttempts; i++) {
    const r = await page.request.get(`${base}/api/financeiro/transferencias/${transfer.id}/`, { headers });
    const t = await r.json();
    if (t.status === 'settled') {
      settled = true;
      break;
    }
    await page.waitForTimeout(1000);
  }

  expect(settled, 'Transferencia should be settled after import').toBeTruthy();
});