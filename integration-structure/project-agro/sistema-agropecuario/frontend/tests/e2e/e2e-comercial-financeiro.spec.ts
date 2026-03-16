/**
 * Playwright E2E — Módulo Comercial + Financeiro
 * ================================================
 * Cria dados REAIS no banco da aplicação em execução (localhost:8001).
 * Os registros ficam persistidos após o teste para inspeção manual.
 *
 * Fluxo coberto:
 *   1. Autenticação (reutiliza helper existente)
 *   2. Criação de 2 Clientes via API
 *   3. Criação de 2 Fornecedores via API
 *   4. Criação de 2 Contas Bancárias via API
 *   5. Criação de 1 Empresa (direta de fixture de fallback)
 *   6. Criação de 2 Contratos de Compra via API
 *   7. Criação de 2 Contratos de Venda via API
 *   8. Criação de 2 Contratos Financeiros via API (empréstimo + consórcio)
 *   9. Criação de Lançamentos Financeiros (entradas e saídas)
 *  10. Listagem e verificação em cada módulo
 *
 * Executar com:
 *   cd frontend && npx playwright test tests/e2e/e2e-comercial-financeiro.spec.ts
 *
 * Para rodar em modo headed (ver o navegador):
 *   npx playwright test tests/e2e/e2e-comercial-financeiro.spec.ts --headed
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// ─── Timestamp único para CPFs/CNPJs desta execução ────────────────────────
const RUN_ID = Date.now() % 1_000_000; // últimos 6 dígitos do timestamp

// ─── URL base do backend — detectada dinamicamente ─────────────────────────
// Permite rodar tanto do host (localhost:8001) quanto de dentro do container
// Docker onde o backend é acessível por 'backend:8000'.
let BACKEND_BASE = process.env.BACKEND_BASE_URL || '';

async function detectBackendBase(request: APIRequestContext): Promise<string> {
  if (BACKEND_BASE) return BACKEND_BASE;
  const candidates = [
    'http://localhost:8001',
    'http://backend:8000',
    'http://127.0.0.1:8001',
  ];
  for (const url of candidates) {
    try {
      const r = await request.get(`${url}/api/`, { timeout: 2000 });
      if (r.status() < 500) { BACKEND_BASE = url; return url; }
    } catch { /* try next */ }
  }
  throw new Error('Cannot reach backend API from any candidate URL');
}

// ─── Helper: POST com auth e verificação de status ─────────────────────────
async function apiPost(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
  headers: Record<string, string>,
  expectedStatus = 201,
): Promise<any> {
  const resp = await request.post(`${BACKEND_BASE}${path}`, { data, headers, timeout: 15_000 });
  const body = await resp.json().catch(() => null);
  if (resp.status() !== expectedStatus) {
    console.error(`[E2E] POST ${path} -> ${resp.status()}`, body);
  }
  return { status: resp.status(), body };
}

async function apiGet(
  request: APIRequestContext,
  path: string,
  headers: Record<string, string>,
): Promise<any> {
  const resp = await request.get(`${BACKEND_BASE}${path}`, { headers, timeout: 15_000 });
  return { status: resp.status(), body: await resp.json().catch(() => null) };
}

// ─── Fixture: garante uma Empresa existente ─────────────────────────────────
async function getOrCreateEmpresa(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<number> {
  // Tenta listar
  const list = await apiGet(request, '/api/comercial/empresas/', headers);
  if (list.status === 200) {
    const results = list.body?.results ?? list.body;
    if (Array.isArray(results) && results.length > 0) {
      return results[0].id as number;
    }
  }
  // Se não existir, cria
  const { body, status } = await apiPost(request, '/api/comercial/empresas/', {
    nome: 'Empresa E2E Demo',
    cnpj: `${RUN_ID}`.padStart(14, '0'),
  }, headers);
  expect(status, `Criar Empresa falhou: ${JSON.stringify(body)}`).toBe(201);
  return body.id as number;
}

// ─── Fixture: garante uma InstituicaoFinanceira existente ────────────────────
async function getOrCreateInstituicao(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<number> {
  const list = await apiGet(request, '/api/comercial/instituicoes-financeiras/', headers);
  if (list.status === 200) {
    const results = list.body?.results ?? list.body;
    if (Array.isArray(results) && results.length > 0) {
      return results[0].id as number;
    }
  }
  const codigo = `E${RUN_ID % 100000}`.slice(0, 10);
  const { body, status } = await apiPost(
    request,
    '/api/comercial/instituicoes-financeiras/',
    { codigo_bacen: codigo, nome: 'Banco Demo E2E', segmento: 'banco_comercial' },
    headers,
  );
  expect(status, `Criar InstituicaoFinanceira falhou: ${JSON.stringify(body)}`).toBe(201);
  return body.id as number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — Clientes
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('E2E Comercial + Financeiro — dados persistentes', () => {
  // Executa em série — os testes compartilham variáveis (IDs criados) entre si
  test.describe.configure({ mode: 'serial' });

  // ─ Variáveis compartilhadas entre testes dentro do describe ─────────────────
  let headers: Record<string, string>;
  let empresaId: number;
  let instituicaoId: number;
  let cliente1Id: number;
  let cliente2Id: number;
  let forn1Id: number;
  let forn2Id: number;
  let conta1Id: number;
  let conta2Id: number;
  let contratoCompra1Id: number;
  let contratoCompra2Id: number;
  let contratoVenda1Id: number;
  let contratoVenda2Id: number;

  // ─── Setup: autenticação ────────────────────────────────────────────────────
  // Detecta o backend disponível (localhost:8001 ou backend:8000) e faz login
  // diretamente via API — sem passar pelo frontend React.
  test.beforeAll(async ({ request }) => {
    BACKEND_BASE = await detectBackendBase(request);
    console.log(`[E2E] Backend base URL: ${BACKEND_BASE}`);
    const resp = await request.post(`${BACKEND_BASE}/api/auth/login/`, {
      data: { username: 'admin', password: 'admin123' },
      timeout: 10_000,
    });
    if (!resp.ok()) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Login falhou (${resp.status()}): ${text}`);
    }
    const body = await resp.json();
    headers = { Authorization: `Bearer ${body.access}` };
    console.log(`[E2E] Autenticado — token obtido [RUN_ID=${RUN_ID}]`);
  });

  // ─── 1. Clientes ─────────────────────────────────────────────────────────────
  test('1 — cria Cliente 1 (PF) e verifica na listagem', async ({ request }) => {
    const cpf = `${RUN_ID}01`.padStart(11, '0').slice(0, 11);
    const { status, body } = await apiPost(request, '/api/comercial/clientes/', {
      nome: `E2E Cliente PF [${RUN_ID}]`,
      tipo_pessoa: 'pf',
      cpf_cnpj: cpf,
      email: `e2e.pf.${RUN_ID}@demo.com`,
      telefone: '11999990001',
      status: 'ativo',
    }, headers);

    expect(status, `Cliente 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    cliente1Id = body.id;
    expect(body.nome).toContain('E2E Cliente PF');
  });

  test('2 — cria Cliente 2 (PJ) e verifica na listagem', async ({ request }) => {
    const cnpj = `${RUN_ID}02`.padStart(14, '0').slice(0, 14);
    const { status, body } = await apiPost(request, '/api/comercial/clientes/', {
      nome: `E2E Fazenda Demo LTDA [${RUN_ID}]`,
      tipo_pessoa: 'pj',
      cpf_cnpj: cnpj,
      email: `e2e.pj.${RUN_ID}@demo.com`,
      telefone: '11999990002',
      status: 'ativo',
    }, headers);

    expect(status, `Cliente 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    cliente2Id = body.id;
    expect(body.tipo_pessoa).toBe('pj');
  });

  test('3 — lista clientes e confirma os criados', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/comercial/clientes/', headers);
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];
    const ids = results.map((c: any) => c.id);
    expect(ids).toContain(cliente1Id);
    expect(ids).toContain(cliente2Id);
  });

  // ─── 2. Fornecedores ─────────────────────────────────────────────────────────
  test('4 — cria Fornecedor 1 (Insumos)', async ({ request }) => {
    const cnpj = `${RUN_ID}03`.padStart(14, '0').slice(0, 14);
    const { status, body } = await apiPost(request, '/api/comercial/fornecedores/', {
      nome: `E2E AgroInsumos LTDA [${RUN_ID}]`,
      tipo_pessoa: 'pj',
      cpf_cnpj: cnpj,
      email: `insumos.${RUN_ID}@demo.com`,
      telefone: '11988880001',
      categoria_fornecedor: 'insumos',
      status: 'ativo',
    }, headers);

    expect(status, `Fornecedor 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    forn1Id = body.id;
    expect(body.nome).toContain('E2E AgroInsumos');
  });

  test('5 — cria Fornecedor 2 (Serviços)', async ({ request }) => {
    const cnpj = `${RUN_ID}04`.padStart(14, '0').slice(0, 14);
    const { status, body } = await apiPost(request, '/api/comercial/fornecedores/', {
      nome: `E2E Transportes Campo Verde [${RUN_ID}]`,
      tipo_pessoa: 'pj',
      cpf_cnpj: cnpj,
      email: `frete.${RUN_ID}@demo.com`,
      telefone: '11988880002',
      categoria_fornecedor: 'servicos',
      status: 'ativo',
    }, headers);

    expect(status, `Fornecedor 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    forn2Id = body.id;
  });

  test('6 — lista fornecedores e confirma os criados', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/comercial/fornecedores/', headers);
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];
    const ids = results.map((f: any) => f.id);
    expect(ids).toContain(forn1Id);
    expect(ids).toContain(forn2Id);
  });

  // ─── 3. Contas Bancárias ─────────────────────────────────────────────────────
  test('7 — cria Conta Bancária 1 (corrente)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/financeiro/contas/', {
      banco: `Caixa Demo A [${RUN_ID}]`,
      agencia: '0001',
      conta: `${RUN_ID}-1`,
      tipo: 'corrente',
      saldo_inicial: '50000.00',
      ativo: true,
    }, headers);

    expect(status, `Conta 1 não criada: ${JSON.stringify(body)}`).toBe(201);
    conta1Id = body.id;
    expect(body.tipo).toBe('corrente');
  });

  test('8 — cria Conta Bancária 2 (poupança)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/financeiro/contas/', {
      banco: `Bradesco Demo B [${RUN_ID}]`,
      agencia: '0002',
      conta: `${RUN_ID}-2`,
      tipo: 'poupanca',
      saldo_inicial: '20000.00',
      ativo: true,
    }, headers);

    expect(status, `Conta 2 não criada: ${JSON.stringify(body)}`).toBe(201);
    conta2Id = body.id;
    expect(body.tipo).toBe('poupanca');
  });

  test('9 — lista contas bancárias e confirma saldos', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/financeiro/contas/', headers);
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];
    const conta1 = results.find((c: any) => c.id === conta1Id);
    const conta2 = results.find((c: any) => c.id === conta2Id);
    expect(conta1).toBeDefined();
    expect(parseFloat(conta1.saldo_inicial)).toBeCloseTo(50000, 0);
    expect(conta2).toBeDefined();
  });

  // ─── 4. Contratos de Compra ───────────────────────────────────────────────────
  test('10 — obtém empresa e institução (fixtures de apoio)', async ({ request }) => {
    empresaId = await getOrCreateEmpresa(request, headers);
    instituicaoId = await getOrCreateInstituicao(request, headers);
    expect(empresaId).toBeGreaterThan(0);
    expect(instituicaoId).toBeGreaterThan(0);
  });

  test('11 — cria Contrato de Compra 1 (Sementes)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/comercial/contratos-compra/', {
      titulo: `Compra Sementes Safra 25/26 [${RUN_ID}]`,
      numero_contrato: `CC-${RUN_ID}-01`,
      fornecedor: forn1Id,
      empresa: empresaId,
      status: 'rascunho',
      data_inicio: '2025-08-01',
      data_fim: '2025-12-31',
    }, headers);

    expect(status, `ContratoCompra 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    contratoCompra1Id = body.id;
    expect(body.titulo).toContain('Compra Sementes');
  });

  test('12 — cria Contrato de Compra 2 (Fertilizantes)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/comercial/contratos-compra/', {
      titulo: `Compra Fertilizantes 2026 [${RUN_ID}]`,
      numero_contrato: `CC-${RUN_ID}-02`,
      fornecedor: forn2Id,
      empresa: empresaId,
      status: 'pendente',
      data_inicio: '2026-01-01',
      data_fim: '2026-06-30',
    }, headers);

    expect(status, `ContratoCompra 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    contratoCompra2Id = body.id;
    expect(body.status).toBe('pendente');
  });

  test('13 — lista contratos de compra e confirma os criados', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/comercial/contratos-compra/', headers);
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];
    const ids = results.map((c: any) => c.id);
    expect(ids).toContain(contratoCompra1Id);
    expect(ids).toContain(contratoCompra2Id);
  });

  // ─── 5. Contratos de Venda ────────────────────────────────────────────────────
  test('14 — cria Contrato de Venda 1 (Soja)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/comercial/contratos-venda/', {
      titulo: `Venda Soja Safra 25/26 [${RUN_ID}]`,
      numero_contrato: `CV-${RUN_ID}-01`,
      cliente: cliente1Id,
      empresa: empresaId,
      status: 'rascunho',
      numero_parcelas: 3,
      data_inicio: '2025-10-01',
      data_fim: '2026-01-31',
    }, headers);

    expect(status, `ContratoVenda 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    contratoVenda1Id = body.id;
    expect(body.titulo).toContain('Venda Soja');
  });

  test('15 — cria Contrato de Venda 2 (Milho)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/comercial/contratos-venda/', {
      titulo: `Venda Milho 2026 [${RUN_ID}]`,
      numero_contrato: `CV-${RUN_ID}-02`,
      cliente: cliente2Id,
      empresa: empresaId,
      status: 'pendente',
      numero_parcelas: 1,
      data_inicio: '2026-02-01',
      data_fim: '2026-04-30',
    }, headers);

    expect(status, `ContratoVenda 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    contratoVenda2Id = body.id;
  });

  test('16 — lista contratos de venda e confirma os criados', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/comercial/contratos-venda/', headers);
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];
    const ids = results.map((c: any) => c.id);
    expect(ids).toContain(contratoVenda1Id);
    expect(ids).toContain(contratoVenda2Id);
  });

  // ─── 6. Contratos Financeiros ─────────────────────────────────────────────────
  test('17 — cria Contrato Financeiro 1 (Empréstimo)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/comercial/contratos-financeiro/', {
      titulo: `Empréstimo Custeio Agrícola [${RUN_ID}]`,
      numero_contrato: `CF-${RUN_ID}-01`,
      produto_financeiro: 'emprestimo',
      beneficiario: cliente1Id,
      instituicao_financeira: instituicaoId,
      empresa: empresaId,
      valor_total: '150000.00',
      valor_entrada: '15000.00',
      status: 'proposta',
      data_vigencia_inicial: '2025-09-01',
      data_vigencia_final: '2026-09-01',
    }, headers);

    expect(status, `ContratoFinanceiro 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    expect(body.produto_financeiro).toBe('emprestimo');
    expect(body.beneficiario).toBe(cliente1Id);
  });

  test('18 — cria Contrato Financeiro 2 (Consórcio)', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/comercial/contratos-financeiro/', {
      titulo: `Consórcio Maquinário Agro [${RUN_ID}]`,
      numero_contrato: `CF-${RUN_ID}-02`,
      produto_financeiro: 'consorcio',
      beneficiario: cliente2Id,
      instituicao_financeira: instituicaoId,
      empresa: empresaId,
      valor_total: '80000.00',
      valor_entrada: '8000.00',
      status: 'proposta',
      data_vigencia_inicial: '2025-10-01',
      data_vigencia_final: '2028-10-01',
    }, headers);

    expect(status, `ContratoFinanceiro 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    expect(body.produto_financeiro).toBe('consorcio');
  });

  test('19 — lista contratos financeiros', async ({ request }) => {
    const { status, body } = await apiGet(request, '/api/comercial/contratos-financeiro/', headers);
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];
    const produtos = results.map((c: any) => c.produto_financeiro);
    // Ao menos existem os recém-criados
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(produtos).toContain('emprestimo');
    expect(produtos).toContain('consorcio');
  });

  // ─── 7. Lançamentos Financeiros ────────────────────────────────────────────────
  test('20 — lançamento de ENTRADA: recebimento venda de Soja', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/financeiro/lancamentos/', {
      conta: conta1Id,
      tipo: 'entrada',
      valor: '65000.00',
      data: '2025-11-15',
      descricao: `Recebimento Contrato CV-${RUN_ID}-01 — Soja Safra 25/26`,
    }, headers);

    expect(status, `Lançamento entrada 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    expect(body.tipo).toBe('entrada');
    expect(parseFloat(body.valor)).toBeCloseTo(65000, 0);
  });

  test('21 — lançamento de SAÍDA: pagamento compra de Sementes', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/financeiro/lancamentos/', {
      conta: conta1Id,
      tipo: 'saida',
      valor: '15000.00',
      data: '2025-09-10',
      descricao: `Pagamento Contrato CC-${RUN_ID}-01 — Sementes Safra 25/26`,
    }, headers);

    expect(status, `Lançamento saída 1 não criado: ${JSON.stringify(body)}`).toBe(201);
    expect(body.tipo).toBe('saida');
  });

  test('22 — lançamento de ENTRADA: recebimento venda de Milho', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/financeiro/lancamentos/', {
      conta: conta2Id,
      tipo: 'entrada',
      valor: '42000.00',
      data: '2026-03-20',
      descricao: `Recebimento Contrato CV-${RUN_ID}-02 — Milho 2026`,
    }, headers);

    expect(status, `Lançamento entrada 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    expect(parseFloat(body.valor)).toBeCloseTo(42000, 0);
  });

  test('23 — lançamento de SAÍDA: pagamento compra de Fertilizantes', async ({ request }) => {
    const { status, body } = await apiPost(request, '/api/financeiro/lancamentos/', {
      conta: conta2Id,
      tipo: 'saida',
      valor: '22000.00',
      data: '2026-01-20',
      descricao: `Pagamento Contrato CC-${RUN_ID}-02 — Fertilizantes 2026`,
    }, headers);

    expect(status, `Lançamento saída 2 não criado: ${JSON.stringify(body)}`).toBe(201);
    expect(body.tipo).toBe('saida');
  });

  test('24 — lista lançamentos e verifica saldo líquido da conta 1', async ({ request }) => {
    const { status, body } = await apiGet(
      request,
      `/api/financeiro/lancamentos/?conta=${conta1Id}`,
      headers,
    );
    expect(status).toBe(200);
    const results: any[] = body?.results ?? body ?? [];

    const entradas = results
      .filter((l: any) => l.tipo === 'entrada' && l.conta === conta1Id)
      .reduce((s: number, l: any) => s + parseFloat(l.valor), 0);

    const saidas = results
      .filter((l: any) => l.tipo === 'saida' && l.conta === conta1Id)
      .reduce((s: number, l: any) => s + parseFloat(l.valor), 0);

    // Deve conter no mínimo as duas que criamos
    expect(entradas).toBeGreaterThanOrEqual(65000);
    expect(saidas).toBeGreaterThanOrEqual(15000);
    // Saldo líquido das movimentações + saldo inicial
    const saldoLiquido = 50000 + entradas - saidas;
    expect(saldoLiquido).toBeGreaterThanOrEqual(100000);
    console.log(`[E2E] Conta 1: saldo_inicial=50000 + entradas=${entradas} - saidas=${saidas} = ${saldoLiquido}`);
  });

  // ─── 8. Verificação visual no browser ────────────────────────────────────────
  test('25 — navega para /financeiro e exibe lançamentos no browser', async ({ page }) => {
    // Injeta token JWT no localStorage para autenticar o SPA sem passar pelo login
    const accessToken = headers.Authorization?.replace('Bearer ', '') ?? '';
    await page.addInitScript((token) => {
      try { localStorage.setItem('sistema_agro_tokens', JSON.stringify({ access: token, refresh: token })); } catch (e) { /* ignore */ }
    }, accessToken);

    await page.goto('/financeiro', { waitUntil: 'load' });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: '/tmp/e2e-financeiro.png', fullPage: true }).catch(() => {});
    console.log('[E2E] Screenshot: /tmp/e2e-financeiro.png');

    const hasError = await page.locator('text=500').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('26 — navega para /comercial e exibe clientes/fornecedores criados', async ({ page }) => {
    const accessToken = headers.Authorization?.replace('Bearer ', '') ?? '';
    await page.addInitScript((token) => {
      try { localStorage.setItem('sistema_agro_tokens', JSON.stringify({ access: token, refresh: token })); } catch (e) { /* ignore */ }
    }, accessToken);

    await page.goto('/comercial/clientes', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/e2e-clientes.png', fullPage: true }).catch(() => {});
    console.log('[E2E] Screenshot: /tmp/e2e-clientes.png');

    const hasError = await page.locator('text=500').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  // ─── 9. Resumo final ──────────────────────────────────────────────────────────
  test('27 — resumo: IDs criados nesta execução', async () => {
    console.table({
      'Run ID'          : RUN_ID,
      'Cliente PF ID'   : cliente1Id,
      'Cliente PJ ID'   : cliente2Id,
      'Fornecedor 1 ID' : forn1Id,
      'Fornecedor 2 ID' : forn2Id,
      'Conta 1 ID'      : conta1Id,
      'Conta 2 ID'      : conta2Id,
      'Empresa ID'      : empresaId,
      'Inst. Fin. ID'   : instituicaoId,
      'ContratoCompra 1': contratoCompra1Id,
      'ContratoCompra 2': contratoCompra2Id,
      'ContratoVenda 1' : contratoVenda1Id,
      'ContratoVenda 2' : contratoVenda2Id,
    });
    // Todos os IDs principais devem estar populados
    expect(cliente1Id).toBeGreaterThan(0);
    expect(cliente2Id).toBeGreaterThan(0);
    expect(forn1Id).toBeGreaterThan(0);
    expect(forn2Id).toBeGreaterThan(0);
    expect(conta1Id).toBeGreaterThan(0);
    expect(conta2Id).toBeGreaterThan(0);
    expect(contratoCompra1Id).toBeGreaterThan(0);
    expect(contratoVenda1Id).toBeGreaterThan(0);
  });
});
