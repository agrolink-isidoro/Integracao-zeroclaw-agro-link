import { APIRequestContext, Page } from '@playwright/test';

export async function tryLoginRequest(request: APIRequestContext, url: string, username = 'admin', password = 'admin123', attempts = 8, delayMs = 1000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await request.post(url, { data: { username, password }, timeout: 10000 });
      if (r.ok()) return r;
      const text = await r.text().catch(() => '<no body>');
      console.error(`[tryLoginRequest] attempt ${i} to ${url} returned status ${r.status}: ${text}`);
    } catch (e: any) {
      // Distinguish DNS EAI_AGAIN from other errors and retry with backoff
      const msg = e && e.message ? e.message : String(e);
      console.error(`[tryLoginRequest] attempt ${i} to ${url} threw error: ${msg}`);
    }

    // Exponential backoff with jitter
    const backoff = Math.min(30000, delayMs * Math.pow(2, i - 1));
    const jitter = Math.floor(Math.random() * 300);
    await new Promise((res) => setTimeout(res, backoff + jitter));
  }
  return null;
}

export async function tryLogin(request: APIRequestContext) {
  // Prefer localhost first in CI runner where backend runs locally, then try container hostname as fallback
  const urls = [
    'http://localhost:8001/api/auth/login/',
    'http://backend:8000/api/auth/login/',
  ];

  for (const url of urls) {
    const r = await tryLoginRequest(request, url);
    if (r) return { resp: r, base: url.replace('/api/auth/login/', '') };
  }
  return null;
}

export async function ensureLoggedInPage(page: Page) {
  // If the test has already injected tokens and user (via page.addInitScript), prefer those to avoid
  // performing a full login flow which can lead to refresh races in dense CI environments.
  let body: any = null;
  try {
    const existing = await page.evaluate(() => ({ tokens: localStorage.getItem('sistema_agro_tokens'), user: localStorage.getItem('sistema_agro_user') }));
    if (existing && existing.tokens) {
      try {
        body = JSON.parse(existing.tokens);
        body.user = existing.user ? JSON.parse(existing.user) : null;
        // eslint-disable-next-line no-console
        console.debug('[ensureLoggedInPage] using tokens already present in localStorage');
      } catch (e) {
        // ignore parse errors and fall back to login
        body = null;
      }
    }
  } catch (e) {
    // Could not access localStorage yet — fall through to login
  }

  if (!body) {
    const res = await tryLogin(page.request);
    if (!res) throw new Error('Unable to authenticate against backend after retries');
    body = await res.resp.json();
  }

  // Robust approach: inject tokens before the app scripts run so the SPA loads already authenticated.
  await page.addInitScript((tokens) => {
    try {
      localStorage.setItem('sistema_agro_tokens', JSON.stringify({ access: tokens.access, refresh: tokens.refresh }));
      localStorage.setItem('sistema_agro_user', JSON.stringify(tokens.user));
    } catch (e) {
      // ignore
    }
  }, body);

  // Stub /auth/refresh to avoid intermittent 401 races in CI by returning the tokens we just obtained
  await page.route('**/api/core/auth/refresh/', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access: body.access, refresh: body.refresh }) }));

  // Also add a context-level route to catch refresh requests from other pages/iframes, and log it for diagnostics
  await page.context().route('**/api/core/auth/refresh**', (route) => {
    // eslint-disable-next-line no-console
    console.debug('[ensureLoggedInPage] intercepting /api/core/auth/refresh and fulfilling with latest tokens');
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access: body.access, refresh: body.refresh }) });
  });

  // Add lightweight request/response tracing for key endpoints to help triage flakiness (only active during tests)
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/core/auth/refresh') || url.includes('rateios-approvals') || url.includes('/comercial/empresas/1/despesas')) {
      // eslint-disable-next-line no-console
      console.debug('[E2E DEBUG] request', req.method(), url);
    }
  });
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('/api/core/auth/refresh') || url.includes('rateios-approvals') || url.includes('/comercial/empresas/1/despesas')) {
      // eslint-disable-next-line no-console
      console.debug('[E2E DEBUG] response', resp.status(), url);
    }
  });

  // Navigate to app root (will run init scripts and pick up tokens)
  await page.goto('/');

  // Attempt to observe authenticated state (profile request + UI) with retries.
  const maxAttempts = 6;
  let authenticated = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait for the frontend to call /auth/profile and for the UI auth state to appear
      await page.waitForResponse(r => r.url().includes('/api/auth/profile/') && r.status() === 200, { timeout: 10000 });
      // The UI greeting uses the username dynamically; match generic 'Olá,' to be tolerant
      await page.waitForSelector('text=Olá,', { timeout: 10000 });
      authenticated = true;
      // allow background refreshes / in-flight requests to settle (reduce refresh races)
      try {
        await page.waitForResponse(r => r.url().includes('/api/administrativo/centros-custo/') && r.status() === 200, { timeout: 5000 });
      } catch (e) {
        // not critical if not requested
      }
      await page.waitForTimeout(1500);
      break;
    } catch (e) {
      console.warn(`[ensureLoggedInPage] attempt ${attempt} did not observe authenticated UI/profile; retrying login`);
      // Try to re-login via API and re-apply tokens
      const retryRes = await tryLogin(page.request);
      if (!retryRes) continue;
      const retryBody = await retryRes.resp.json();
      // update body so returned headers reflect latest tokens
      Object.assign(body, retryBody);
      await page.addInitScript((tokens) => {
        try {
          localStorage.setItem('sistema_agro_tokens', JSON.stringify({ access: tokens.access, refresh: tokens.refresh }));
          localStorage.setItem('sistema_agro_user', JSON.stringify(tokens.user));
        } catch (e) {
          // ignore
        }
      }, retryBody);
      await page.goto('/');
    }
  }

  if (!authenticated) {
    throw new Error('Unable to observe authenticated UI/profile after retries');
  }

  const base = (typeof (globalThis as any).PLAYWRIGHT_BASE_URL === 'string' && (globalThis as any).PLAYWRIGHT_BASE_URL) || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  return { headers: { Authorization: `Bearer ${body.access}` }, base };
}

