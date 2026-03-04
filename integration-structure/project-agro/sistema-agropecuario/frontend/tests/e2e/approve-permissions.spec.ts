// @ts-nocheck
import { test, expect } from '@playwright/test';

// E2E: user without permission should not see Approve/Reject actions

test('pending approvals: user without approve permission does not see approve buttons', async ({ page }) => {
  // Stub auth
  await page.addInitScript(() => {
    window.localStorage.setItem('sistema_agro_tokens', JSON.stringify({ access: 'test-token', refresh: 'refresh' }));
    window.localStorage.setItem('sistema_agro_user', JSON.stringify({ id: 1, username: 'testuser' }));
  });

  await page.route('**/api/auth/profile/', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, username: 'testuser' }) }));
  await page.route('**/api/administrativo/notificacoes/nao_lidas/', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

  // approvals list
  const approvalId = 901;
  await page.route('**/api/financeiro/rateios-approvals/**', (route, request) => {
    if (request.method().toLowerCase() === 'get') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: approvalId, rateio: { id: 123, titulo: 'Aguardando Permissao' }, status: 'pending', criado_em: new Date().toISOString(), criado_por_nome: 'creator' }]) });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  // permissions endpoint returns false
  await page.route('**/api/financeiro/rateios-approvals/permissions/', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ can_approve: false, can_reject: false }) }));

  // Ensure logged in and navigate to approvals list
  const { ensureLoggedInPage } = await import('./helpers');
  await ensureLoggedInPage(page);

  await page.goto('/financeiro');
  // Allow more time for the page to load in CI runners
  await page.waitForSelector('text=Rateios', { timeout: 20000 });

  // Ensure Rateios Pendentes card is visible
  await page.waitForSelector('h5:has-text("Rateios Pendentes")', { timeout: 15000 });
  // Wait for the pending entry to be rendered (tolerant: the network response may already have completed)
  await page.waitForSelector('text=Aguardando Permissao', { timeout: 30000 });

  // Ensure 'Sem permissão' button visible and 'Aprovar' not visible
  await expect(page.locator('text=Sem permissão')).toBeVisible();
  await expect(page.locator('text=Aprovar')).toHaveCount(0);
});