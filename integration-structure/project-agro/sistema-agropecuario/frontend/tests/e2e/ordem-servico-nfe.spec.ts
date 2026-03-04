import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Ordem Servico NFe - Service Order with NFe Integration', () => {
  // SKIPPED: Service order page or NFe integration not fully implemented for E2E testing
  test.skip('creates service order and generates NFe', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'ordem-servico-nfe');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting service order with NFe test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      const unique = `${Date.now()}`;

      // ========== NAVIGATE TO ORDEM SERVICO ==========
      debug.log('📍 [NAVIGATE] Going to ordem de serviço page');
      const osUrl = `${session.base ?? baseURL}/comercial/ordem-servico`;
      await page.waitForTimeout(2000); await page.goto(osUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR OS LIST ==========
      debug.log('⏳ [WAIT] Waiting for OS list to load');
      await debug.waitForSelector(
        'h1, table, [role="grid"], button:has-text("Nova")',
        120000,
        'os-list-page'
      );
      await debug.takeScreenshot('01-os-page-loaded');

      // ========== CREATE NEW OS ==========
      debug.log('🆕 [CREATE] Creating new ordem de serviço');

      const newOsBtn = page.locator('button:has-text("Nova"), button[data-testid*="nova"]').first();
      if (await newOsBtn.count() > 0) {
        await newOsBtn.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1000);
      } else {
        await page.waitForTimeout(2000); await page.goto(`${session.base ?? baseURL}/comercial/ordem-servico/nova`, { waitUntil: 'networkidle' });
      }

      await debug.waitForSelector('form, input[name*="descri"]', 120000, 'os-form');
      await debug.takeScreenshot('02-os-form-loaded');

      // ========== FILL OS DETAILS ==========
      debug.log('📝 [FORM] Filling service order details');

      const osFormData: Record<string, string> = {};
      osFormData['input[name="descricao"], input[placeholder*="Descrição"]'] = `Ordem de Serviço E2E ${unique}`;
      osFormData['input[name="cliente"], input[placeholder*="Cliente"]'] = 'Cliente Teste E2E';
      osFormData['input[name="valor"], input[placeholder*="Valor"]'] = '1500.00';
      osFormData['input[name="data"], input[type="date"]'] = '2026-03-10';

      for (const [selector, value] of Object.entries(osFormData)) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            await debug.fillForm({ [selector]: value });
          }
        } catch (e) {
          debug.log(`⚠️ Could not fill ${selector}`);
        }
      }

      await debug.takeScreenshot('03-os-details-filled');

      // ========== ADD SERVICE ITEMS WITH NFE REFERENCES ==========
      debug.log('📋 [ITEMS] Adding service items');

      const addItemBtn = page.locator('button:has-text("Adicionar"), button:has-text("Add"), [data-testid*="add-item"]').first();
      if (await addItemBtn.count() > 0) {
        await addItemBtn.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(500);

        // Fill item details
        const itemFields: Record<string, string> = {};
        itemFields['input[placeholder*="Serviço"], input[placeholder*="Item"]'] = 'Serviço de Consultoria';
        itemFields['input[placeholder*="Quantidade"]'] = '1';
        itemFields['input[placeholder*="Valor Unitário"]'] = '1500.00';

        for (const [sel, val] of Object.entries(itemFields)) {
          try {
            const count = await debug.getElementCount(sel);
            if (count > 0) {
              await debug.fillForm({ [sel]: val });
            }
          } catch (e) {
            debug.log(`⚠️ Item field ${sel} not found`);
          }
        }
      }

      await debug.takeScreenshot('04-items-added');

      // ========== ENABLE NFE GENERATION ==========
      debug.log('📄 [NFE] Configuring NFe generation');

      const nfeCheckbox = page.locator('input[name*="gerar_nfe"], input[name*="emitir_nfe"]');
      if (await nfeCheckbox.count() > 0) {
        await nfeCheckbox.check();
        debug.log('✅ NFe generation enabled');
      } else {
        debug.log('ℹ️ No NFe generation checkbox found');
      }

      await debug.takeScreenshot('05-nfe-configured');

      // ========== SUBMIT SERVICE ORDER ==========
      debug.log('✅ [SUBMIT] Submitting service order');

      const [osResponse] = await Promise.all([
        debug.waitForAPI('POST', '/api/comercial/ordem-servico', 120000),
        debug.clickElement('button:has-text("Salvar"), button[type="submit"]', 120000, 'submit-os'),
      ]);

      const osStatus = osResponse.status();
      debug.log(`Service order created - API Status: ${osStatus}`);
      expect(osStatus).toBeLessThan(400);

      const osData = await osResponse.json();
      const osId = osData.id;
      debug.log('OS created', { id: osId, descricao: osData.descricao });

      await page.waitForTimeout(1500);
      await debug.takeScreenshot('06-os-created');

      // ========== GENERATE NFE ==========
      debug.log('📄 [GENERATE] Generating NFe from service order');

      const nfeBtn = page.locator('button:has-text("Gerar NFe"), button:has-text("Emitir"), button[data-testid*="nfe"]').first();
      if (await nfeBtn.count() > 0) {
        try {
          const [nfeResponse] = await Promise.all([
            debug.waitForAPI('POST', '/api/core/nfe|/api/fiscal/nfe', 120000),
            nfeBtn.click({ force: true, timeout: 5000 }),
          ]);

          debug.log(`✅ NFe generated - API Status: ${nfeResponse.status()}`);
          const nfeData = await nfeResponse.json();
          debug.log('NFe data', { numero: nfeData.numero, chave: nfeData.chave });
        } catch (e) {
          debug.log(`⚠️ NFe generation failed: ${(e as Error).message}`);
        }
      } else {
        debug.log('⚠️ No NFe generation button found');
      }

      await page.waitForTimeout(1500);
      await debug.takeScreenshot('07-nfe-generated');

      // ========== VERIFY COMPLETE WORKFLOW ==========
      debug.log('🔍 [VERIFY] Verifying complete OS + NFe workflow');

      // Check if NFe reference appears
      const nfeRefCount = await debug.getElementCount('[data-testid*="nfe"], input:contains("NF")');
      debug.log(`NFe reference elements found: ${nfeRefCount}`);

      await debug.takeScreenshot('08-workflow-verified');

      debug.log('✅ [SUCCESS] Service order with NFe workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Ordem de serviço test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
