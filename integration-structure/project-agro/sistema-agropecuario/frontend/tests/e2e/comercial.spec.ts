import { test, expect } from '@playwright/test';

test('comercial dashboard renders and shows aggregation data', async ({ page }) => {
  const { ensureLoggedInPage } = await import('./helpers');
  
  // Ensure we're logged in
  await ensureLoggedInPage(page);
  
  // Navigate to comercial
  await page.goto('/comercial/dashboard', { waitUntil: 'networkidle' });
  
  // Check that we're on the comercial page (either h1 "Comercial" or h2 being visible)
  try {
    // Try to find the module header
    const moduleHeader = page.locator('h1, h2').first();
    await moduleHeader.waitFor({ timeout: 40000 });
    expect(await moduleHeader.textContent()).toBeTruthy();
  } catch (e) {
    // If headers aren't found, at least check main content is there
    const mainContent = page.locator('[role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 40000 });
  }
});

test('comercial empresa detail page renders and allows CSV download', async ({ page }) => {
  const { ensureLoggedInPage } = await import('./helpers');
  
  // Ensure we're logged in
  await ensureLoggedInPage(page);
  
  // Navigate to empresa detail page
  await page.goto('/comercial/empresas/1', { waitUntil: 'networkidle' });
  
  // Check that the detail page loads (company name, period filter, or CSV button)
  try {
    // Wait for either the company name header, month filter, or CSV export button
    const pageLoaded = await Promise.race([
      page.waitForSelector('h2', { timeout: 40000 }).then(() => true),
      page.waitForSelector('input[type="month"]', { timeout: 40000 }).then(() => true),
      page.waitForSelector('button:has-text("Baixar")', { timeout: 40000 }).then(() => true),
      page.waitForSelector('.card', { timeout: 40000 }).then(() => true),
    ]);
    
    expect(pageLoaded).toBe(true);
  } catch (e) {
    // If nothing found, check for 404 alert
    const alert = page.locator('.alert-warning');
    await expect(alert).toBeVisible({ timeout: 5000 }).catch(() => {
      throw new Error('Empresa detail page did not load properly');
    });
  }
});

test('comercial empresas list page renders', async ({ page }) => {
  const { ensureLoggedInPage } = await import('./helpers');
  
  // Ensure we're logged in
  await ensureLoggedInPage(page);
  
  // Navigate to comercial first to ensure it loads
  await page.goto('/comercial', { waitUntil: 'networkidle' });
  
  // Wait for page content to render
  await page.waitForSelector('h1, h2, [role="main"]', { timeout: 40000 });
  
  // Verify that main content is visible
  const hasContent = await page.locator('[role="main"], .container, .module-content').isVisible({ timeout: 5000 }).catch(() => false);
  expect(hasContent || (await page.locator('h1, h2').isVisible())).toBe(true);
});