import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';

test.describe.configure({ timeout: 60000 });

test('colheitas page renders', async ({ page, baseURL }) => {
  test.setTimeout(60000);
  const messages: string[] = [];
  page.on('console', msg => messages.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', e => messages.push(`[pageerror] ${e.message}`));

  // Ensure logged in
  await ensureLoggedInPage(page);

  // Navigate to colheitas
  await page.goto((baseURL ?? 'http://localhost:5173') + '/agricultura/colheitas');
  await page.waitForLoadState('networkidle');
  
  // Wait for h2 with Colheitas text
  try {
    await page.waitForSelector('h2:has-text("Colheitas")', { timeout: 50000 });
  } catch {
    // Fallback: check for any h2 or h1 on page
    const text = await page.textContent('h1, h2, h3');
    console.log('Available heading:', text);
    throw new Error(`Could not find "Colheitas" heading. Found: ${text}`);
  }
  
  const title = await page.textContent('h2, h1');
  console.log('TITLE:', title?.trim());
  console.log('CONSOLE_MESSAGES:', JSON.stringify(messages));
  expect(title).toBeTruthy();
});


test('open colheita modal and submit', async ({ page, baseURL }) => {
  // Ensure logged in
  await ensureLoggedInPage(page);

  // Navigate to colheitas
  await page.goto((baseURL ?? 'http://localhost:5173') + '/agricultura/colheitas');
  await page.waitForLoadState('networkidle');

  // Open modal - if the action button isn't present (no safras), skip the interactive submit
  const registrarBtn = page.locator('button:has-text("Registrar Colheita")').first();
  if (!(await registrarBtn.count()) || !(await registrarBtn.isVisible())) {
    console.log('No Registrar Colheita button - skipping interactive submit');
    return;
  }
  await registrarBtn.click();
  const modal = page.locator('.modal.show .modal-content');
  await expect(modal).toBeVisible();

  // Select first safra (if present)
  const plantioSelect = modal.getByLabel('Safra (Plantio)');
  const options = await plantioSelect.locator('option').allTextContents();
  if (options.length <= 1) {
    console.log('No plantios available to select - skipping interactive submit test');
    return;
  }
  await plantioSelect.selectOption({ index: 1 });

  // Fill date
  await modal.getByLabel('Data da Colheita').fill('2025-12-01');

  // Choose a talhão and set quantity
  await modal.locator('input[aria-label^="selecionar-talhao"]').first().check();
  // fill quantity for first talhao (use attribute selector)
  await modal.locator('input[aria-label^="quantidade-talhao-"]').first().fill('123');
  // alternative more specific selector
  // await modal.locator('input[aria-label^="quantidade-talhao-"]').first().fill('123');

  // Fill transporte
  await modal.getByLabel('Placa').fill('TEST123');
  await modal.getByLabel('Tara (kg)').fill('1000');
  await modal.getByLabel('Peso Bruto (kg)').fill('1500');
  await modal.getByLabel('Custo Transporte').fill('200');

  // Submit and capture the outgoing request payload for debugging
  const [req] = await Promise.all([
    page.waitForRequest(r => r.url().includes('/api/agricultura/colheitas/') && r.method() === 'POST'),
    modal.getByRole('button', { name: 'Registrar' }).click()
  ]);
  const postBody = JSON.parse(req.postData() || '{}');
  console.log('OUTGOING_PAYLOAD:', JSON.stringify(postBody));

  // Wait for response
  const resp = await req.response();
  if (!resp.ok()) {
    const text = await resp.text();
    console.log('CREATE_RESP_STATUS:', resp.status(), 'BODY:', text);
  }
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body.id).toBeTruthy();
  // If backend returns transportes, check computed peso_liquido
  if (body.transportes && body.transportes.length > 0) {
    expect(Number(body.transportes[0].peso_liquido)).toBeCloseTo(500, 3);
  }
});
