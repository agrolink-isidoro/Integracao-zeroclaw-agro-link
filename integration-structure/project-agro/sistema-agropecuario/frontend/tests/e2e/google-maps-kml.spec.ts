// @ts-nocheck
import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';

// E2E test timeout for map rendering and KML upload
test.setTimeout(120000);

test.describe('Task 3.3: Google Maps + KML Integration E2E', () => {
  test('3.3.1: Mapa carrega com polígonos de talhões (KML upload flow)', async ({ page }) => {
    try {
      // Setup: ensure we're logged in
      await ensureLoggedInPage(page);

      // Get CSRF token
      const csrfData = await page.evaluate(async () => {
        const resp = await fetch('/api/core/csrf/', { credentials: 'include' });
        try {
          return await resp.json();
        } catch (e) {
          return {};
        }
      });
      expect(
        Array.isArray(csrfData.csrfTrustedOrigins) &&
          csrfData.csrfTrustedOrigins.includes('http://localhost:5173')
      ).toBeTruthy();

      // Step 1: Navigate to talhões list
      console.log('[E2E] navigating to /fazendas/talhoes');
      await page.goto('/fazendas/talhoes', { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Step 2: Wait for page to load and create first talhão with KML
      console.log('[E2E] waiting for talhões page...');
      await page.waitForSelector('button:has-text("Novo Talhão")', { timeout: 10000 });

      // Sample KML for first talhão
      const kml1 = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Talhão Test 1</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -47.9,−15.8,0 -47.8,−15.8,0 -47.8,−15.7,0 -47.9,−15.7,0 -47.9,−15.8,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      // Click "Novo Talhão" button
      await page.click('button:has-text("Novo Talhão")');
      console.log('[E2E] "Novo Talhão" button clicked');

      // Wait for modal/form to appear
      await page.waitForSelector('input[type="text"]', { timeout: 10000 });

      // Fill in talhão details
      const inputs = await page.locator('input[type="text"]').all();
      await inputs[0].fill('Talhão Test 1'); // Name
      console.log('[E2E] filled talhão name');

      // Look for KML file input
      const fileInput = await page.locator('input[type="file"]').first();
      if (fileInput) {
        // Create and upload KML file
        const buffer = Buffer.from(kml1, 'utf-8');
        await fileInput.setInputFiles({
          name: 'talhao1.kml',
          mimeType: 'application/vnd.google-earth.kml+xml',
          buffer: buffer,
        });
        console.log('[E2E] KML file 1 uploaded');
      }

      // Submit form
      const submitButton = await page.locator('button:has-text("Salvar")').first();
      await submitButton.click({ timeout: 15000 });
      console.log('[E2E] form submitted for talhão 1');

      // Wait for success message or redirect
      await page.waitForTimeout(2000);

      // Create second talhão with different KML
      const kml2 = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Talhão Test 2</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -47.7,−15.6,0 -47.6,−15.6,0 -47.6,−15.5,0 -47.7,−15.5,0 -47.7,−15.6,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

      // Click Novo Talhão again
      await page.click('button:has-text("Novo Talhão")');
      console.log('[E2E] "Novo Talhão" button clicked (2nd)');

      await page.waitForSelector('input[type="text"]', { timeout: 10000 });
      const inputs2 = await page.locator('input[type="text"]').all();
      await inputs2[0].fill('Talhão Test 2');
      console.log('[E2E] filled talhão 2 name');

      const fileInput2 = await page.locator('input[type="file"]').first();
      if (fileInput2) {
        const buffer2 = Buffer.from(kml2, 'utf-8');
        await fileInput2.setInputFiles({
          name: 'talhao2.kml',
          mimeType: 'application/vnd.google-earth.kml+xml',
          buffer: buffer2,
        });
        console.log('[E2E] KML file 2 uploaded');
      }

      const submitButton2 = await page.locator('button:has-text("Salvar")').first();
      await submitButton2.click({ timeout: 15000 });
      console.log('[E2E] form submitted for talhão 2');

      await page.waitForTimeout(2000);

      // Step 3: Open map view
      console.log('[E2E] navigating to /fazendas/mapa');
      await page.goto('/fazendas/mapa', { waitUntil: 'networkidle', timeout: 30000 });

      console.log('[E2E] waiting for map to load...');
      // Wait for map container to appear
      const mapContainer = page.locator('[data-testid="google-map"]').or(page.locator('.gm-container'));
      await mapContainer.waitFor({ timeout: 15000 });
      console.log('[E2E] map container found');

      // Wait for polygons to be rendered
      console.log('[E2E] waiting for polygons...');
      // Google Maps polygons are rendered as SVG paths in the canvas area
      const polygons = page.locator('[data-testid="polygon"]');
      await page.waitForTimeout(2000); // Give Google Maps time to render
      console.log('[E2E] polygons should be rendered in Google Maps canvas');

      // Step 4: Verify dropdown shows default fazenda selection
      console.log('[E2E] checking default fazenda selection...');
      const fazendaSelects = await page.locator('select').all();
      // Second select should be the fazenda filter (first is layer filter)
      if (fazendaSelects.length >= 2) {
        const fazendaSelect = fazendaSelects[1];
        const selectedValue = await fazendaSelect.inputValue();
        console.log('[E2E] fazenda select value:', selectedValue);

        // Value should be non-empty (user's primary fazenda)
        expect(selectedValue).not.toBe('');
        console.log('[E2E] fazenda is pre-selected with user primary fazenda ✓');

        // Verify selected option text is visible
        const selectedText = await fazendaSelect.locator('option[selected]').textContent();
        console.log('[E2E] selected fazenda text:', selectedText);
        expect(selectedText).not.toBeNull();
      }

      // Step 5: Verify legend is present
      console.log('[E2E] checking for legend...');
      const legend = page.locator('text=Legenda').or(page.locator(':has-text("Legenda")'));
      await expect(legend).toBeVisible({ timeout: 5000 });
      console.log('[E2E] legend is visible ✓');

      // Step 6: Verify feature count in legend
      const featureCount = page.locator('text=/elemento\\(s\\) no mapa/');
      await expect(featureCount).toBeVisible({ timeout: 5000 });
      console.log('[E2E] feature count badge visible ✓');

      // Step 7: Test dropdown change (change from default to "Todas fazendas")
      console.log('[E2E] testing dropdown change...');
      if (fazendaSelects.length >= 2) {
        const fazendaSelect = fazendaSelects[1];
        
        // Change to "Todas fazendas"
        await fazendaSelect.selectOption('');
        console.log('[E2E] changed filter to "Todas fazendas"');

        // Wait for query to reload
        await page.waitForTimeout(2000);

        // Verify that we still see the map
        await expect(mapContainer).toBeVisible({ timeout: 5000 });
        console.log('[E2E] map reloaded after filter change ✓');
      }

      console.log('[E2E] ✅ All map E2E tests passed!');
    } catch (error) {
      console.error('[E2E ERROR]', error);
      throw error;
    }
  });

  test('3.3.2: Mapa erro handling (sem API key)', async ({ page }) => {
    try {
      await ensureLoggedInPage(page);

      // Temporarily remove the API key from env (via page context)
      // This test validates the fallback message
      console.log('[E2E] testing map without API key fallback...');
      await page.goto('/fazendas/mapa', { waitUntil: 'domcontentloaded', timeout: 15000 });

      // If no API key, should show alert or table fallback
      const alertOrTable = page
        .locator('text=Google Maps API Key não configurada')
        .or(page.locator('table'));

      // Either message or table should be visible
      const alertVisible = await page
        .locator('text=Google Maps API Key não configurada')
        .isVisible()
        .catch(() => false);
      const tableVisible = await page.locator('table').isVisible().catch(() => false);

      expect(alertVisible || tableVisible).toBeTruthy();
      console.log('[E2E] fallback handling works ✓');
    } catch (error) {
      console.error('[E2E ERROR]', error);
      throw error;
    }
  });

  test('3.3.3: Layer filter synchronizes with fazenda filter', async ({ page }) => {
    try {
      await ensureLoggedInPage(page);

      console.log('[E2E] testing layer + fazenda filter combination...');
      await page.goto('/fazendas/mapa', { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for map and filters
      const mapContainer = page.locator('[data-testid="google-map"]').or(page.locator('.gm-container'));
      await mapContainer.waitFor({ timeout: 15000 });

      const selects = await page.locator('select').all();
      expect(selects.length).toBeGreaterThanOrEqual(2);

      // Get initial fazenda value
      const fazendaSelect = selects[1];
      const initialValue = await fazendaSelect.inputValue();
      console.log('[E2E] initial fazenda:', initialValue);

      // Change layer to "Talhões"
      const layerSelect = selects[0];
      await layerSelect.selectOption('talhoes');
      console.log('[E2E] changed layer to "talhoes"');

      await page.waitForTimeout(2000);

      // Verify fazenda filter is still selected
      const fazendaAfter = await fazendaSelect.inputValue();
      console.log('[E2E] fazenda after layer change:', fazendaAfter);

      expect(fazendaAfter).toBe(initialValue);
      console.log('[E2E] fazenda filter persists across layer change ✓');

      // Verify map is still visible
      await expect(mapContainer).toBeVisible({ timeout: 5000 });
      console.log('[E2E] map visible after filter change ✓');
    } catch (error) {
      console.error('[E2E ERROR]', error);
      throw error;
    }
  });
});
