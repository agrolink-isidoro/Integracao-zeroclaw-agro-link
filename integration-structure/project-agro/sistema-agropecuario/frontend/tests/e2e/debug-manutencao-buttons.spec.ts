import { test } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';

// Debug test: list buttons on /manutencao to locate the 'Nova Ordem de Serviço' trigger
test('debug: list buttons on manutencao page', async ({ page }) => {
  const auth = await ensureLoggedInPage(page);
  await page.goto((auth.base ?? '') + '/manutencao');
  await page.waitForLoadState('networkidle');

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const buttons = await page.$$eval('button', els => els.map(b => ({ text: b.textContent?.trim(), id: b.id || null, class: b.className }))); 
  console.log('buttons:', buttons.slice(0, 50));

  // also dump headings to help locate modal triggers
  const headings = await page.$$eval('h1,h2,h3,h4,h5,h6', els => els.map(h => ({ tag: h.tagName, text: h.textContent?.trim() })));
  console.log('headings:', headings.slice(0, 50));

  // try to click any button containing 'Ordem' to open the modal (best-effort)
  const ordemBtn = await page.locator('button:has-text("Ordem")').first();
  if (await ordemBtn.count() > 0) {
    await ordemBtn.click();
    console.log('clicked button with text containing Ordem');
  } else {
    console.log('no button containing Ordem found');
  }

  await page.waitForTimeout(1000);
});