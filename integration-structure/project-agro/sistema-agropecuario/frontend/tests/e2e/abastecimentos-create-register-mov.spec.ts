import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';

// This E2E verifies that creating an Abastecimento via the UI registers a MovimentacaoEstoque of origem 'abastecimento'
test('Abastecimento creation registers estoque movimentacao', async ({ page }) => {
  const auth = await ensureLoggedInPage(page);

  // Create a product and an entrada movimentacao to have a last price
  const produtoPayload = { codigo: `E2E-DIESEL-${Date.now()}`, nome: 'Diesel E2E', unidade: 'L' };
  const prodRes = await page.request.post('/api/estoque/produtos/', { data: produtoPayload, headers: auth.headers });
  expect(prodRes.ok()).toBeTruthy();
  const produto = await prodRes.json();

  const movPayload = { produto: produto.id, tipo: 'entrada', quantidade: '50.00', valor_unitario: '6.66' };
  const movRes = await page.request.post('/api/estoque/movimentacoes/', { data: movPayload, headers: auth.headers });
  expect(movRes.ok()).toBeTruthy();

  // Ensure there's an equipment to use
  const eqRes = await page.request.get('/api/maquinas/equipamentos/', { headers: auth.headers });
  const eqList = await eqRes.json();
  const equipamentoId = eqList.results?.[0]?.id || eqList[0]?.id;
  expect(equipamentoId).toBeTruthy();

  // Open UI, wait prefill, fill quantity and submit
  await page.goto((auth.base ?? '') + '/maquinas/abastecimentos');
  await page.waitForSelector('h1:has-text("Abastecimentos")', { timeout: 5000 });
  await page.click('button:has-text("Novo Abastecimento")');

  // Wait shortly for prefill (if it happens). If not, set produto_estoque explicitly from the product created above.
  try {
    await page.waitForFunction(() => {
      const el = document.querySelector('select[name="produto_estoque"]');
      return el && (el as HTMLSelectElement).value !== '';
    }, { timeout: 5000 });
  } catch (e) {
    // fallback: set hidden select to produto.id
    await page.evaluate((pid) => {
      const sel = document.querySelector('select[name="produto_estoque"]') as HTMLSelectElement | null;
      if (sel) sel.value = String(pid);
    }, produto.id);
  }

  // Ensure date is a valid ISO-like value (datetime-local expects YYYY-MM-DDTHH:MM)
  const nowLocal = new Date().toISOString().slice(0,16);
  await page.fill('input[name="data_abastecimento"]', nowLocal).catch(()=>{});

  // Fill equipment and quantity then submit
  await page.selectOption('select[name="equipamento"]', String(equipamentoId)).catch(()=>{});
  await page.fill('input[name="quantidade_litros"]', '10');

  // Intercept creation and then check estoque mov
  const [postResp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/maquinas/abastecimentos/') && r.request().method() === 'POST'),
    page.click('button:has-text("Salvar")'),
  ]);

  if (!postResp.ok()) {
    const body = await postResp.text();
    console.error('Abastecimento POST failed', postResp.status(), body);
  }

  expect(postResp.ok()).toBeTruthy();
  const created = await postResp.json();

  // Now poll estoque movimentacoes for origem=abastecimento and produto id
  // Use the created abastecimento's linked product id to check movimentacoes
  const produtoIdToCheck = created.produto_estoque || created.produto;

  // Poll for the movimentacao up to a few tries (to handle async DB visibility)
  let found = false;
  for (let i = 0; i < 6; i++) {
    const movsRes = await page.request.get(`/api/estoque/movimentacoes/?origem=abastecimento&produto=${produtoIdToCheck}`, { headers: auth.headers });
    expect(movsRes.ok()).toBeTruthy();
    const movsBody = await movsRes.json();
    const results = movsBody.results || movsBody;
    found = results.some((m:any) => Number(m.quantidade) === 10 && m.origem === 'abastecimento');
    if (found) break;
    await page.waitForTimeout(500);
  }

  expect(found).toBeTruthy();
});