import { test, expect } from '@playwright/test';

async function loginAndGetAuthHeader(page: any) {
  const { ensureLoggedInPage } = await import('./helpers');
  const auth = await ensureLoggedInPage(page);
  if (!auth) throw new Error('E2E: unable to authenticate in adjust_flow test');
  return auth;
}

test('adjust flow: reconcile exists -> adjust updates lote and creates ajuste movimentacao', async ({ page }) => {
  const auth = await loginAndGetAuthHeader(page);
  const headers = auth.headers;
  const base = auth.base || 'http://localhost:8001';

  // 1) Create a MovimentacaoCarga via API
  const movPayload = {
    peso_bruto: 1000,
    tara: 0,
    descontos: 0,
    peso_liquido: 1000,
    destino_tipo: 'armazenagem_interna'
  };
  const movResp = await page.request.post(`${base}/api/agricultura/movimentacoes-carga/`, { data: movPayload, headers });
  expect(movResp.ok()).toBeTruthy();
  const mov = await movResp.json();
  expect(mov.id).toBeTruthy();

  // 2) Find a product to use for lote (use first produto)
  const produtosResp = await page.request.get(`${base}/api/estoque/produtos/`, { headers });
  expect(produtosResp.ok()).toBeTruthy();
  const produtosBody = await produtosResp.json();
  const produtos = Array.isArray(produtosBody) ? produtosBody : (produtosBody && produtosBody.results) || [];
  if (produtos.length === 0) {
    console.log('No products found; skipping test');
    test.skip();
    return;
  }
  const produto = produtos[0];

  // 3) Create lote
  const lotePayload = {
    produto: produto.id,
    numero_lote: `E2E-COL-${mov.id}`,
    quantidade_inicial: 1000,
    quantidade_atual: 1000,
    local_armazenamento: 'Silo E2E'
  };
  const loteResp = await page.request.post(`${base}/api/estoque/lotes/`, { data: lotePayload, headers });
  expect(loteResp.ok()).toBeTruthy();
  const lote = await loteResp.json();

  // 4) Create MovimentacaoEstoque referencing the MovimentacaoCarga (reconcile simulation)
  const mestPayload = {
    produto: produto.id,
    lote: lote.id,
    tipo: 'entrada',
    origem: 'colheita',
    quantidade: 1000,
    documento_referencia: `MovimentacaoCarga #${mov.id}`,
    motivo: 'E2E entrada',
  };
  const mestResp = await page.request.post(`${base}/api/estoque/movimentacoes/`, { data: mestPayload, headers });
  expect(mestResp.ok()).toBeTruthy();
  const mest = await mestResp.json();
  expect(mest.id).toBeTruthy();

  // 5) Call adjust endpoint to increase quantity to 1200
  const adjustResp = await page.request.post(`${base}/api/agricultura/movimentacoes-carga/${mov.id}/adjust/`, { data: { new_quantity: 1200, reason: 'umidade menor' }, headers });
  expect(adjustResp.ok()).toBeTruthy();
  const adjustData = await adjustResp.json();
  expect(adjustData.status).toBe('adjusted');
  const ajusteId = adjustData.adjustment_id;
  expect(ajusteId).toBeTruthy();

  // 6) Validate that adjustment MovimentacaoEstoque exists and is 'entrada'
  const ajusteResp = await page.request.get(`${base}/api/estoque/movimentacoes/${ajusteId}/`, { headers });
  expect(ajusteResp.ok()).toBeTruthy();
  const ajuste = await ajusteResp.json();
  expect(ajuste.tipo).toBe('entrada');

  // 7) Validate that lote.quantidade_atual equals 1200
  const loteFinalResp = await page.request.get(`${base}/api/estoque/lotes/${lote.id}/`, { headers });
  expect(loteFinalResp.ok()).toBeTruthy();
  const loteFinal = await loteFinalResp.json();
  expect(Number(loteFinal.quantidade_atual)).toBeCloseTo(1200, 3);

  // 8) Validate mov was updated
  const movFinalResp = await page.request.get(`${base}/api/agricultura/movimentacoes-carga/${mov.id}/`, { headers });
  expect(movFinalResp.ok()).toBeTruthy();
  const movFinal = await movFinalResp.json();
  expect(Number(movFinal.peso_liquido)).toBeCloseTo(1200, 3);

  // 9) Now test decrease adjustment to 900
  const adjustResp2 = await page.request.post(`${base}/api/agricultura/movimentacoes-carga/${mov.id}/adjust/`, { data: { new_quantity: 900, reason: 'danos' }, headers });
  expect(adjustResp2.ok()).toBeTruthy();
  const adjustData2 = await adjustResp2.json();
  expect(adjustData2.status).toBe('adjusted');
  const ajusteId2 = adjustData2.adjustment_id;
  const ajuste2Resp = await page.request.get(`${base}/api/estoque/movimentacoes/${ajusteId2}/`, { headers });
  const ajuste2 = await ajuste2Resp.json();
  expect(ajuste2.tipo).toBe('saida');

  // final lote qty should be 900
  const loteFinalResp2 = await page.request.get(`${base}/api/estoque/lotes/${lote.id}/`, { headers });
  const loteFinal2 = await loteFinalResp2.json();
  expect(Number(loteFinal2.quantidade_atual)).toBeCloseTo(900, 3);
});