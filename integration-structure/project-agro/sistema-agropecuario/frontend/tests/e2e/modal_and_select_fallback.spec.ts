import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });

const tryLogin = async (page: any) => {
  const { tryLogin: _tryLogin } = await import('./helpers');
  await page.goto('/comercial');
  const resp = await _tryLogin(page.request);
  if (resp && resp.resp && resp.resp.ok()) {
    const body = await resp.resp.json();
    await page.evaluate((b) => {
      localStorage.setItem('sistema_agro_tokens', JSON.stringify({ access: b.access, refresh: b.refresh }));
      localStorage.setItem('sistema_agro_user', JSON.stringify(b.user));
    }, body);
  }
};

test('opens "Nova Venda" modal reliably', async ({ page }) => {
  await tryLogin(page);
  await page.goto('/comercial');
  await page.waitForLoadState('networkidle');

  // Ensure Vendas tab is active then click the button and assert modal opens
  await page.click('button:has-text("Vendas")');
  await page.waitForSelector('button:has-text("Nova Venda")', { timeout: 3000 });
  await page.click('button:has-text("Nova Venda")');
  await page.waitForSelector('.modal.show.d-block .modal-title:has-text("Nova Venda")', { timeout: 5000 });
  expect(await page.locator('.modal.show.d-block .modal-title').textContent()).toContain('Nova Venda');

  // Close modal and ensure it is removed
  await page.click('.modal.show.d-block .btn-close');
  await page.waitForSelector('.modal.show.d-block', { state: 'detached', timeout: 5000 });
});

test('SelectFK shows fallback input when endpoint fails', async ({ page, baseURL }) => {
  const { ensureLoggedInPage } = await import('./helpers');
  await ensureLoggedInPage(page);

  // Intercept fornecedores endpoint used by SelectFK and return 500
  await page.route('**/comercial/fornecedores*', async (route) => {
    await route.fulfill({ status: 500, body: 'server error' });
  });
  // Also intercept possible /api/... path
  await page.route('**/api/comercial/fornecedores*', async (route) => {
    await route.fulfill({ status: 500, body: 'server error' });
  });
  // Direct match for Vite dev server origin
  await page.route('http://localhost:5173/api/comercial/fornecedores*', async (route) => {
    await route.fulfill({ status: 500, body: 'server error' });
  });
  await page.route('http://localhost:5173/comercial/fornecedores*', async (route) => {
    await route.fulfill({ status: 500, body: 'server error' });
  });

  // Monkey-patch XMLHttpRequest early to force fornecedores XHRs to error
  await page.addInitScript(() => {
    const origOpen = (XMLHttpRequest.prototype as any).open;
    const origSend = (XMLHttpRequest.prototype as any).send;
    (XMLHttpRequest.prototype as any).open = function(method: string, url: string | URL) {
      (this as any)._url = typeof url === 'string' ? url : String(url);
      return origOpen.apply(this, arguments as any);
    };
    (XMLHttpRequest.prototype as any).send = function(body?: any) {
      if ((this as any)._url && (this as any)._url.includes('/comercial/fornecedores')) {
        // simulate server error by invoking onerror/onreadystatechange
        setTimeout(() => {
          try {
            this.status = 500;
            this.readyState = 4;
            this.onreadystatechange && this.onreadystatechange();
            this.onerror && this.onerror(new Error('Simulated network error'));
          } catch (e) {
            // ignore
          }
        }, 0);
        return;
      }
      return origSend.apply(this, arguments as any);
    };
  });

  await page.goto((baseURL ?? 'http://localhost:5173') + '/comercial/compras/new');
  await page.waitForLoadState('networkidle');

  // Allow small time for the XHR to be attempted and the component to react
  await page.waitForTimeout(500);

  // The SelectFK component should render a fallback input with data-testid
  // Use a more lenient selector with fallback to any label containing the text
  try {
    await page.waitForSelector('input[data-testid="selectfk-fallback"]', { timeout: 50000 });
  } catch {
    console.log('[E2E] Fallback input not found by testid, checking for error message');
    await page.waitForSelector('input[placeholder*="Erro"], input[placeholder*="erro"]', { timeout: 50000 });
  }
  const fallbackInput = page.locator('input[data-testid="selectfk-fallback"], input[placeholder*="Erro"], input[placeholder*="erro"]').first();
  const placeholder = await fallbackInput.getAttribute('placeholder');
  expect(placeholder).toContain('Erro ao carregar opções');
});