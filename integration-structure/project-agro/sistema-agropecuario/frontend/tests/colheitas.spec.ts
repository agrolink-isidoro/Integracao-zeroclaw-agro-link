import { test, expect } from '@playwright/test';

test('colheitas page renders', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', msg => messages.push());
  page.on('pageerror', e => messages.push());

  await page.goto('http://localhost:5173/agricultura/colheitas');
  await page.waitForSelector('h2', { timeout: 5000 });
  const title = await page.textContent('h2');
  console.log('TITLE:', title?.trim());
  console.log('CONSOLE_MESSAGES:', JSON.stringify(messages));
  expect(title).toContain('Colheitas');
});
