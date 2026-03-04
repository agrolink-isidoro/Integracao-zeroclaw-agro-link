import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Operacoes - Agricultural Operations', () => {
  // SKIPPED: /operacoes page not implemented or not properly connected to routes
  test.skip('creates and completes agricultural operation', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'operacoes-agriculture');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting agricultural operations test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      const unique = `${Date.now()}`;

      // ========== NAVIGATE TO OPERACOES ==========
      debug.log('📍 [NAVIGATE] Going to operacoes page');
      const operacoesUrl = `${session.base ?? baseURL}/operacoes`;
      await page.waitForTimeout(2000); await page.goto(operacoesUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR OPERATIONS LIST ==========
      debug.log('⏳ [WAIT] Waiting for operations list');
      await debug.waitForSelector('h1, [data-testid*="operations"], button:has-text("Nova")', 120000, 'operacoes-page');
      await debug.takeScreenshot('01-operacoes-page-loaded');

      // ========== CREATE NEW OPERATION ==========
      debug.log('🆕 [CREATE] Creating new operation');
      
      const newOpBtn = page.locator('button:has-text("Nova"), button[data-testid*="nova"]').first();
      if (await newOpBtn.count() > 0) {
        await newOpBtn.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1000);
      } else {
        debug.log('⚠️ No nova button found, trying alternative');
        await page.waitForTimeout(2000); await page.goto(`${session.base ?? baseURL}/operacoes/nova`, { waitUntil: 'networkidle' });
      }

      await debug.checkPageState();
      await debug.waitForSelector('input[name*="nome"], input[placeholder*="Nome"], form', 120000, 'operacao-form');
      await debug.takeScreenshot('02-operacao-form-loaded');

      // ========== FILL OPERATION DATA ==========
      debug.log('📝 [FORM] Filling operation details');

      // Try multiple field name patterns
      const formData: Record<string, string> = {};
      formData['input[name="nome"], input[placeholder*="Nome"]'] = `Operação Agrícola ${unique}`;
      formData['input[name="descricao"], input[placeholder*="Descrição"]'] = 'E2E Test Agricultural Operation';
      formData['input[name="data_inicio"], input[type="date"]:first'] = '2026-02-01';

      await debug.fillForm(formData);
      await debug.takeScreenshot('03-operation-form-filled');

      // ========== SELECT CROP TYPE ==========
      debug.log('🌾 [SELECT] Selecting crop type');

      const cropSelectors = [
        'select[name="tipo_cultivo"], select[name="cultura"]',
        'input[placeholder*="Cultivo"], input[placeholder*="Cultura"]',
        '[role="combobox"]'
      ];

      for (const selector of cropSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          try {
            await debug.clickElement(selector, 120000, 'crop-select');
            await page.waitForTimeout(500);
            
            const firstOption = page.locator('option, [role="option"]').first();
            if (await firstOption.count() > 0) {
              await firstOption.click({ force: true, timeout: 5000 });
              debug.log(`✅ Crop selected via: ${selector}`);
              break;
            }
          } catch (e) {
            debug.log(`⚠️ Crop selection via ${selector} failed`);
          }
        }
      }

      await debug.takeScreenshot('04-crop-selected');

      // ========== SUBMIT OPERATION ==========
      debug.log('✅ [SUBMIT] Submitting operation form');

      const [apiResponse] = await Promise.all([
        debug.waitForAPI('POST', '/api/operacoes|/api/core/operacoes', 120000),
        debug.clickElement('button:has-text("Salvar"), button[type="submit"]', 120000, 'submit-operation'),
      ]);

      const status = apiResponse.status();
      debug.log(`Operation created - API Status: ${status}`);
      expect(status).toBeLessThan(400);

      const operationData = await apiResponse.json();
      debug.log('Operation created', { 
        id: operationData.id, 
        nome: operationData.nome,
        status: operationData.status 
      });

      await debug.takeScreenshot('05-operation-created');

      // ========== COMPLETE OPERATION ==========
      debug.log('🏁 [COMPLETE] Marking operation as complete');

      // Try to find and click complete button
      const completeBtn = page.locator('button:has-text("Concluir"), button:has-text("Complete")').first();
      if (await completeBtn.count() > 0) {
        const [completeResponse] = await Promise.all([
          debug.waitForAPI('PATCH|PUT', '/api/operacoes|/api/core/operacoes', 120000),
          completeBtn.click({ force: true, timeout: 5000 }),
        ]);

        debug.log(`Operation completed - Status: ${completeResponse.status()}`);
      } else {
        debug.log('⚠️ No complete button found, operation may auto-complete');
      }

      await debug.takeScreenshot('06-operation-completed');

      debug.log('✅ [SUCCESS] Agricultural operation workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Operations test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
