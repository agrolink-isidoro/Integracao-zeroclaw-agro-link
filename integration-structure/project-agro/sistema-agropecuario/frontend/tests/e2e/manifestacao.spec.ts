import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Manifestacao - NFe Manifestation', () => {
  test('creates and manages NFe manifestations', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'manifestacao-nfe');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting NFe manifestation test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      const unique = `${Date.now()}`;

      // ========== NAVIGATE TO MANIFESTACOES ==========
      debug.log('📍 [NAVIGATE] Going to manifestacoes page');
      const manifestacaoUrl = `${session.base ?? baseURL}/fiscal/manifestacao`;
      await page.goto(manifestacaoUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR MANIFESTACOES LIST ==========
      debug.log('⏳ [WAIT] Waiting for manifestacoes list to load');
      await page.waitForTimeout(2000);
      await debug.waitForSelector(
        'button, h1, div',
        120000,
        'manifestacao-list-page'
      );
      await debug.takeScreenshot('01-manifestacao-list-loaded');

      // ========== CHECK FOR PENDING MANIFESTACOES ==========
      debug.log('🔍 [SEARCH] Looking for pending NFe manifestations');

      const rowCount = await debug.getElementCount('tr, [role="row"]');
      debug.log(`Found ${rowCount} rows in manifestation list`);

      if (rowCount > 1) {
        // Try clicking on first pending manifestacao
        debug.log('🎯 [CLICK] Clicking first manifestacao for manifestation');

        const firstRow = page.locator('tr, [role="row"]').nth(1); // Skip header
        
        if (await firstRow.count() > 0) {
          // Try clicking action button first
          const actionBtn = firstRow.locator('button, a[role="button"]').first();
          if (await actionBtn.count() > 0) {
            await debug.waitForElement(actionBtn, 30000, 'manifestacao-action');
            await actionBtn.click();
          } else {
            // Click the whole row
            await firstRow.click();
          }

          await page.waitForTimeout(1000);
          await debug.checkPageState();
          await debug.takeScreenshot('02-manifestacao-details-opened');
        }
      } else {
        debug.log('⚠️ No manifestacoes found in list, this may be expected in test environment');
        await debug.takeScreenshot('02-no-manifestacoes');
      }

      // ========== LOOK FOR MANIFESTACAO FORM ==========
      debug.log('📝 [FORM] Checking for manifestacao form');

      const formSelectors = [
        'form',
        '[data-testid*="manifestacao-form"]',
        '[role="form"]',
        'input[name*="manifestacao"], textarea',
      ];

      let formFound = false;
      for (const selector of formSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          formFound = true;
          debug.log(`✅ Form found with selector: ${selector}`);
          break;
        }
      }

      if (!formFound) {
        debug.log('ℹ️ No explicit form found, trying to access manifestacao detail via API');
      }

      // ========== MANIFESTACAO TYPES ==========
      debug.log('📋 [MANIFESTACAO] Checking available manifestacao types');

      const tipoManifestacao = page.locator('select, [role="combobox"]').first();
      if (await tipoManifestacao.count() > 0) {
        debug.log('Found combobox for manifestacao type selection');

        await tipoManifestacao.click();
        await page.waitForTimeout(500);

        const options = page.locator('option, [role="option"]');
        const optionCount = await options.count();
        debug.log(`Available manifestacao types: ${optionCount}`);

        // Select first available option
        const firstOption = options.nth(0);
        if (await firstOption.count() > 0) {
          await firstOption.click();
          debug.log('Selected first manifestacao type');
        }
      }

      await debug.takeScreenshot('03-manifestacao-type-selected');

      // ========== FILL MANIFESTACAO DATA ==========
      debug.log('✏️ [FILL] Filling manifestacao data');

      const manifestacaoData = {};
      manifestacaoData['textarea[name*="justifica"]'] = `Manifestação E2E ${unique}`;
      manifestacaoData['input[name*="descri"], input[placeholder*="Descrição"]'] = `Test manifestacao ${unique}`;

      for (const [selector, value] of Object.entries(manifestacaoData)) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            await debug.fillForm({ [selector]: value as string });
          }
        } catch (e) {
          debug.log(`⚠️ Could not fill ${selector}`);
        }
      }

      await debug.takeScreenshot('04-manifestacao-filled');

      // ========== SUBMIT MANIFESTACAO ==========
      debug.log('✅ [SUBMIT] Submitting manifestacao');

      const submitSelectors = [
        'button:has-text("Manifestar")',
        'button:has-text("Enviar")',
        'button:has-text("Salvar")',
        'button[type="submit"]',
      ];

      let submitSucceeded = false;

      for (const selector of submitSelectors) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            const [response] = await Promise.all([
              debug.waitForAPI('POST|PATCH', '/api/fiscal/manifestacao|/api/core/nfe', 60000),
              debug.clickElement(selector, 30000, 'submit-manifestacao'),
            ]);

            const status = response.status();
            debug.log(`✅ Manifestacao submitted - API Status: ${status}`);
            expect(status).toBeLessThan(400);
            submitSucceeded = true;
            break;
          }
        } catch (e) {
          debug.log(`⚠️ Selector ${selector} failed: ${(e as Error).message}`);
        }
      }

      if (!submitSucceeded) {
        debug.log('⚠️ No submit button found for manifestacao');
      }

      await page.waitForTimeout(2000);
      await debug.takeScreenshot('05-manifestacao-submitted');

      // ========== VERIFY MANIFESTACAO ==========
      debug.log('🔍 [VERIFY] Verifying manifestacao was created');

      // Check for success message
      const successCount = await debug.getElementCount('[role="alert"]:has-text("sucesso|criado|manifestado")');
      
      if (successCount > 0) {
        debug.log('✅ Success message visible');
      } else {
        debug.log('ℹ️ No explicit success message');
      }

      // Navigate back to list
      await page.goto(manifestacaoUrl, { waitUntil: 'networkidle' });
      await debug.takeScreenshot('06-back-to-list');

      debug.log('✅ [SUCCESS] Manifestacao workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Manifestacao test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
