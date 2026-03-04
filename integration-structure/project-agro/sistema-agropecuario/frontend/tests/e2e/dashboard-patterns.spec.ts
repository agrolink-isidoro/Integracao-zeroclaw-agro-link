import { test } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';

test('dashboard pattern audit: verify nav-tabs presence across apps', async ({ page }) => {
  await ensureLoggedInPage(page);

  const pagesToCheck: Array<{ name: string; path: string }> = [
    { name: 'Comercial', path: '/comercial' },
    { name: 'Financeiro', path: '/financeiro/dashboard' },
    { name: 'Estoque', path: '/estoque' },
    { name: 'Maquinas', path: '/maquinas' },
    { name: 'Fazendas', path: '/fazendas/dashboard' },
    { name: 'Agricultura', path: '/agricultura' },
    { name: 'Administrativo', path: '/administrativo' },
    { name: 'Fiscal', path: '/fiscal' },
  ];

  const deviations: Array<{ name: string; path: string; reason: string }> = [];

  for (const p of pagesToCheck) {
    try {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      // wait a bit for SPA content to render
      await page.waitForTimeout(800);

      const navTabs = await page.locator('ul.nav.nav-tabs').first();
      const count = await navTabs.count();

      if (!count) {
        deviations.push({ name: p.name, path: p.path, reason: 'missing nav.nav-tabs' });
        console.log(`AUDIT: ${p.name} (${p.path}) => missing nav.nav-tabs`);
        continue;
      }

      // Validate that there is more than one tab
      const tabs = await navTabs.locator('li').count();
      if (tabs < 2) {
        deviations.push({ name: p.name, path: p.path, reason: `nav-tabs has too few items (${tabs})` });
        console.log(`AUDIT: ${p.name} (${p.path}) => nav-tabs has too few items (${tabs})`);
      } else {
        console.log(`OK: ${p.name} (${p.path}) => nav-tabs present (${tabs} items)`);
      }
    } catch (e: any) {
      deviations.push({ name: p.name, path: p.path, reason: `error: ${e.message}` });
      console.log(`AUDIT-ERROR: ${p.name} (${p.path}) => ${e.message}`);
    }
  }

  console.log('\n=== DASHBOARD PATTERN AUDIT SUMMARY ===');
  if (!deviations.length) console.log('All checked dashboards follow the nav-tabs pattern.');
  else {
    for (const d of deviations) console.log(`- ${d.name} (${d.path}): ${d.reason}`);
  }
});
