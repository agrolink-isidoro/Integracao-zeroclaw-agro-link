/**
 * Data-seeding script: creates a HarvestSession + items + 3 MovimentacaoCarga
 * for the Safra Soja so the Central de Inteligência KPIs have real values to show.
 *
 * Run once with:
 *   npx playwright test tests/e2e/seed-harvest-data.spec.ts --headed
 */
import { test, expect } from '@playwright/test';

const API_BASES = [
  'http://localhost:8001/api',
  'http://localhost:8000/api',
];

async function apiBase(request: any): Promise<string> {
  for (const base of API_BASES) {
    try {
      const r = await request.get(`${base}/auth/login/`, { timeout: 3000 }).catch(() => null);
      if (r) return base;
    } catch (_) { /* ignore */ }
  }
  return API_BASES[0];
}

test('seed: create harvest session + 3 movimentações de carga for Safra Soja', async ({ request }) => {
  const BASE = await apiBase(request);
  console.log('Using API base:', BASE);

  // ---- 1. Login ----
  const loginResp = await request.post(`${BASE}/auth/login/`, {
    data: { username: 'admin', password: 'admin123' },
  });
  expect(loginResp.ok(), `Login failed: ${await loginResp.text()}`).toBeTruthy();
  const { access: token } = await loginResp.json();
  const headers = { Authorization: `Bearer ${token}` };

  // ---- 2. Find the Safra Soja plantio ----
  const plantiosResp = await request.get(`${BASE}/agricultura/plantios/`, { headers });
  expect(plantiosResp.ok()).toBeTruthy();
  const plantiosData = await plantiosResp.json();
  const plantios: any[] = plantiosData.results ?? plantiosData;
  const safra = plantios.find((p: any) =>
    (p.cultura_nome || '').toLowerCase().includes('soja') ||
    (p.nome_safra || '').toLowerCase().includes('soja')
  ) ?? plantios[0];
  expect(safra, 'No plantio found').toBeTruthy();
  console.log(`Using Safra: id=${safra.id} nome=${safra.nome_safra ?? safra.cultura_nome}`);

  // ---- 3. Get talhões of this plantio ----
  const plantioDetailResp = await request.get(`${BASE}/agricultura/plantios/${safra.id}/`, { headers });
  expect(plantioDetailResp.ok()).toBeTruthy();
  const plantioDetail = await plantioDetailResp.json();
  // talhoes may be a list of ids or objects
  const talhaoIds: number[] = (plantioDetail.talhoes || []).map((t: any) =>
    typeof t === 'object' ? t.id : t
  );
  console.log('Talhão IDs:', talhaoIds);

  // If no talhões associated, fetch from fazendas
  let talhaoId: number | null = talhaoIds[0] ?? null;
  if (!talhaoId) {
    const talhaoResp = await request.get(`${BASE}/fazendas/talhoes/?page_size=5`, { headers });
    const talhaoData = await talhaoResp.json();
    const talhoes = talhaoData.results ?? talhaoData;
    talhaoId = talhoes[0]?.id ?? null;
    console.warn('Plantio has no talhões, using first available talhão:', talhaoId);
  }
  expect(talhaoId, 'No talhão available').toBeTruthy();

  // ---- 4. Create or reuse a HarvestSession ----
  // Fetch ALL sessions (filter by plantio may not be indexed) and match client-side
  const sessionsResp = await request.get(
    `${BASE}/agricultura/harvest-sessions/?page_size=100`,
    { headers }
  );
  const sessionsData = await sessionsResp.json();
  const sessions: any[] = sessionsData.results ?? sessionsData;
  let session = sessions.find((s: any) =>
    s.plantio === safra.id && s.status === 'em_andamento'
  ) ?? sessions.find((s: any) => s.plantio === safra.id);

  if (!session) {
    const today = new Date().toISOString().slice(0, 10);
    const createSessionResp = await request.post(`${BASE}/agricultura/harvest-sessions/`, {
      headers,
      data: {
        plantio: safra.id,
        data_inicio: today,
        status: 'em_andamento',
        observacoes: 'Sessão criada via Playwright para seed de dados',
        itens: [{ talhao: talhaoId, quantidade_colhida: 0, status: 'colhido' }],
      },
    });
    expect(createSessionResp.ok(), `Create session failed: ${await createSessionResp.text()}`).toBeTruthy();
    session = await createSessionResp.json();
    console.log('Created HarvestSession id:', session.id);
  } else {
    console.log('Reusing HarvestSession id:', session.id, 'status:', session.status);
  }

  // ---- 5. Get or create HarvestSessionItems ----
  // Refresh session detail to get itens
  const sessionDetailResp = await request.get(`${BASE}/agricultura/harvest-sessions/${session.id}/`, { headers });
  const sessionDetail = await sessionDetailResp.json();
  let existingItems: any[] = sessionDetail.itens ?? [];
  const sessionItemIds: number[] = existingItems.map((i: any) => i.id);

  // If session is finalizada, we need a new session (or we'll just try adding movimentações directly)
  const sessionActive = ['planejada', 'em_andamento'].includes(session.status);

  // Create one item if none exist and session is active
  if (sessionItemIds.length === 0 && sessionActive) {
    const createItemResp = await request.post(`${BASE}/agricultura/harvest-session-items/`, {
      headers,
      data: { session: session.id, talhao: talhaoId, quantidade_colhida: 0, status: 'colhido' },
    });
    if (createItemResp.ok()) {
      const item = await createItemResp.json();
      sessionItemIds.push(item.id);
      console.log(`Created HarvestSessionItem id=${item.id} talhao=${talhaoId}`);
    } else {
      console.warn('Could not create session item:', await createItemResp.text());
    }
  }

  console.log('Session item IDs available:', sessionItemIds);

  // ---- 6. Find a local de armazenamento ----
  const locaisResp = await request.get(`${BASE}/estoque/locais-armazenamento/?page_size=5`, { headers });
  const locaisData = await locaisResp.json();
  const locais: any[] = locaisData.results ?? locaisData;
  const localId: number | null = locais[0]?.id ?? null;
  console.log('Local armazenamento id:', localId);

  // ---- 7. Create 3 MovimentacaoCarga ----
  const movimentacoes = [
    {
      label: 'Carga 1 — 28t, custo R$420',
      peso_bruto: 30000,
      tara: 2000,
      descontos: 0,
      custo_transporte: 420.0,
      custo_transporte_unidade: 'tonelada',
      placa: 'ABC-1234',
      motorista: 'João Silva',
    },
    {
      label: 'Carga 2 — 33t, custo R$495',
      peso_bruto: 35500,
      tara: 2500,
      descontos: 0,
      custo_transporte: 495.0,
      custo_transporte_unidade: 'tonelada',
      placa: 'DEF-5678',
      motorista: 'Pedro Santos',
    },
    {
      label: 'Carga 3 — 25t, custo R$375',
      peso_bruto: 27200,
      tara: 2200,
      descontos: 0,
      custo_transporte: 375.0,
      custo_transporte_unidade: 'tonelada',
      placa: 'GHI-9012',
      motorista: 'Carlos Oliveira',
    },
  ];

  const sessionItemId = sessionItemIds[0] ?? null;
  if (!sessionItemId) {
    console.warn('⚠️  No session_item id — movimentações will link to talhao only');
  }
  let created = 0;

  for (const mov of movimentacoes) {
    const payload: Record<string, any> = {
      session_item: sessionItemId,
      talhao: talhaoId,
      placa: mov.placa,
      motorista: mov.motorista,
      tara: mov.tara,
      peso_bruto: mov.peso_bruto,
      descontos: mov.descontos,
      custo_transporte: mov.custo_transporte,
      custo_transporte_unidade: mov.custo_transporte_unidade,
      destino_tipo: localId ? 'armazenagem_interna' : 'armazenagem_geral',
      local_tipo: 'armazem',
      transporte: {
        placa: mov.placa,
        motorista: mov.motorista,
        tara: mov.tara,
        peso_bruto: mov.peso_bruto,
        descontos: mov.descontos,
        custo_transporte: mov.custo_transporte,
        custo_transporte_unidade: mov.custo_transporte_unidade,
      },
    };
    if (localId) payload.local_destino = localId;

    const resp = await request.post(`${BASE}/agricultura/movimentacoes-carga/`, {
      headers,
      data: payload,
    });

    if (resp.ok()) {
      const body = await resp.json();
      created++;
      const pesoLiquido = (mov.peso_bruto - mov.tara - mov.descontos) / 1000;
      console.log(`✅ ${mov.label} — id=${body.id} peso_líquido≈${pesoLiquido.toFixed(1)}t`);
    } else {
      const errText = await resp.text();
      console.warn(`⚠️  ${mov.label} failed (${resp.status}): ${errText}`);
    }
  }

  console.log(`\nCreated ${created}/${movimentacoes.length} movimentações de carga`);
  console.log('Session KPIs will update on next /agricultura/plantios/<id>/kpis/ call (cache busted).');

  // ---- 8. Invalidate KPI cache by calling the endpoint ----
  const kpisResp = await request.get(`${BASE}/agricultura/plantios/${safra.id}/kpis/`, { headers });
  if (kpisResp.ok()) {
    const kpis = await kpisResp.json();
    console.log('\n📊 KPIs pós-seed:');
    console.log(`  producao_session_kg : ${kpis.producao_session_kg}`);
    console.log(`  producao_colheita_kg: ${kpis.producao_colheita_kg}`);
    console.log(`  custo_transporte    : R$ ${kpis.custo_transporte_total}`);
    console.log(`  carregamentos_count : ${kpis.carregamentos_count}`);
    console.log(`  custo_total         : R$ ${kpis.custo_total}`);
  }

  expect(created).toBeGreaterThan(0);
});
