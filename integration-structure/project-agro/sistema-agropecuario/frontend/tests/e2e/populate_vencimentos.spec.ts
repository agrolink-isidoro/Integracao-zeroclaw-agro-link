import { test, expect } from '@playwright/test';

// This helper script populates the backend with sample vencimentos for manual testing
// Usage: npx playwright test tests/e2e/populate_vencimentos.spec.ts --project=chromium --headed

test('Popula vencimentos para testes manuais', async ({ page }) => {
  const { ensureLoggedInPage } = await import('./helpers');
  const auth = await ensureLoggedInPage(page);

  // Clean up existing vencimentos without detailed description
  const listRes = await page.request.get('/api/financeiro/vencimentos/?page_size=1000', { headers: auth.headers });
  expect(listRes.ok()).toBeTruthy();
  const list = await listRes.json();
  const items = list.results || list;

  for (const v of items) {
    if (!v.descricao || v.descricao.trim().length === 0) {
      const del = await page.request.delete(`/api/financeiro/vencimentos/${v.id}/`, { headers: auth.headers });
      if (!del.ok()) console.warn('Falha ao deletar vencimento id=', v.id);
    }
  }

  // Dates range
  const dates = [
    '2026-01-20', '2026-01-21', '2026-01-22', // make these overdue
    '2026-01-23', '2026-01-24', '2026-01-25',
    '2026-01-26', '2026-01-27', '2026-01-28',
    '2026-01-29', '2026-01-30'
  ];

  // We'll create 10 vencimentos with unique titles/descriptions
  const toCreate = [] as any[];
  for (let i = 0; i < 10; i++) {
    const dt = dates[2 + i] || dates[2 + (i % (dates.length - 2))];
    const valor = (50 + Math.round(Math.random() * 2450)) + Math.round(Math.random() * 99) / 100;
    const titulo = `Teste Manual Vencimento ${i + 1}`;
    const descricao = `Vencimento de teste manual para QA. Conta: Banco Teste ${i + 1}. Detalhes: pagamento fornecedor ${i + 1}.`;
    const status = (i < 3) ? 'atrasado' : 'pendente';
    toCreate.push({ titulo, descricao, valor, data_vencimento: dates[i], status, tipo: 'despesa' });
  }

  const createdIds = [] as number[];
  for (const payload of toCreate) {
    const res = await page.request.post('/api/financeiro/vencimentos/', { data: payload, headers: auth.headers });
    if (!res.ok()) {
      console.error('Erro criando vencimento', payload, await res.text());
    } else {
      const j = await res.json();
      createdIds.push(j.id);
    }
  }

  console.log('Vencimentos criados com ids:', createdIds.join(', '));

  // Quick verification: ensure at least 10 exist with prefix
  const afterRes = await page.request.get('/api/financeiro/vencimentos/?page_size=1000', { headers: auth.headers });
  expect(afterRes.ok()).toBeTruthy();
  const afterList = await afterRes.json();
  const matches = (afterList.results || afterList).filter((v: any) => v.titulo && v.titulo.startsWith('Teste Manual Vencimento'));
  expect(matches.length).toBeGreaterThanOrEqual(10);

  console.log('População concluída. Navegue para /financeiro -> Vencimentos e Calendário para verificar.');
});