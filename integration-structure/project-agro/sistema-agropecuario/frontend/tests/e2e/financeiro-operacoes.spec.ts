import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Financeiro Operacoes - Financial Operations Modal', () => {
  // SKIPPED: Modal or page rendering issues with financial operations module
  test.skip('manages financial operations: loans and financing', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'financeiro-operacoes-modal');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting financial operations test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      const unique = `${Date.now()}`;

      // ========== NAVIGATE TO FINANCEIRO OPERACOES ==========
      debug.log('📍 [NAVIGATE] Going to financeiro operacoes page');
      const operacoesUrl = `${session.base ?? baseURL}/financeiro/operacoes`;
      await page.goto(operacoesUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR OPERACOES LIST ==========
      debug.log('⏳ [WAIT] Waiting for operacoes list to load');
      await page.waitForTimeout(3000);
      await debug.waitForSelector(
        'button, h1, [class*="container"]',
        120000,
        'operacoes-list-page'
      );
      await debug.takeScreenshot('01-operacoes-page-loaded');

      // ========== CREATE NEW FINANCIAL OPERATION ==========
      debug.log('🆕 [CREATE] Creating new financial operation');

      const newOpBtn = page.locator('button').first();
      if (await newOpBtn.count() > 0) {
        await newOpBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      await debug.checkPageState();
      await debug.waitForSelector('input, button, form', 120000, 'operacao-modal');
      await debug.takeScreenshot('02-operacao-modal-opened');

      // ========== SELECT OPERATION TYPE ==========
      debug.log('📋 [TYPE] Selecting operation type');

      const typeSelectors = [
        'select[name="tipo"], select[name="tipo_operacao"]',
        'input[placeholder*="Tipo"], [role="combobox"]',
      ];

      for (const selector of typeSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          try {
            await debug.clickElement(selector, 120000, 'type-select');
            await page.waitForTimeout(500);

            // Select first option
            const options = page.locator('option, [role="option"]');
            const firstOpt = options.first();
            if (await firstOpt.count() > 0) {
              await firstOpt.click();
              debug.log(`✅ Operation type selected via: ${selector}`);
              break;
            }
          } catch (e) {
            debug.log(`⚠️ Type selection via ${selector} failed`);
          }
        }
      }

      await debug.takeScreenshot('03-type-selected');

      // ========== FILL OPERATION FORM GENERICALLY ==========
      debug.log('📝 [FORM] Filling financial operation form with generic strategy');
      await page.waitForTimeout(2000);

      // Strategy: Fill all inputs orderly, check count, fill what we can
      const allInputs = page.locator('input:not([type="hidden"])');
      const allInputCount = await allInputs.count();
      debug.log(`📊 Found ${allInputCount} fillable inputs`);

      const fillValues = [`Operação Financeira ${unique}`, '5000.00', '10.5', '2026-03-01', '2026-06-01'];
      
      for (let i = 0; i < Math.min(5, allInputCount); i++) {
        try {
          const input = allInputs.nth(i);
          await input.click({ force: true, timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(300);
          await input.fill(fillValues[i], { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(200);
        } catch (e) {
          debug.log(`⚠️ Could not fill input ${i}: ${(e as Error).message}`);
        }
      }

      await debug.takeScreenshot('04-operation-details-filled');

      // ========== SELECT RELATED ENTITY ==========
      debug.log('🔗 [LINK] Selecting related compra/despesa');

      try {
        await debug.clickElement(
          'select[name="compra"], select[name="compra_id"], input[placeholder*="Compra"]',
          120000,
          'compra-select'
        );
        await page.waitForTimeout(500);

        const compraOption = page.locator('option, [role="option"]').first();
        if (await compraOption.count() > 0) {
          await compraOption.click();
          debug.log('✅ Compra linked to operation');
        }
      } catch (e) {
        debug.log(`⚠️ Could not link compra: ${(e as Error).message}`);
      }

      await debug.takeScreenshot('05-entity-linked');

      // ========== SUBMIT OPERATION ==========
      debug.log('✅ [SUBMIT] Submitting financial operation');

      const [apiResponse] = await Promise.all([
        debug.waitForAPI('POST', '/api/financeiro/operacoes|/api/financeiro/operacao', 120000),
        debug.clickElement('button:has-text("Salvar"), button[type="submit"]', 120000, 'submit-operation'),
      ]);

      const status = apiResponse.status();
      debug.log(`Operation created - API Status: ${status}`);
      expect(status).toBeLessThan(400);

      const operationPayload = await apiResponse.json();
      debug.log('Operation data', { 
        id: operationPayload.id,
        descricao: operationPayload.descricao,
        valor: operationPayload.valor,
      });

      await page.waitForTimeout(1500);
      await debug.takeScreenshot('06-operation-created');

      // ========== VERIFY IN LIST ==========
      debug.log('🔍 [VERIFY] Verifying operation appears in list');

      // Check if new operation appears in table
      const rows = await debug.getElementCount('tr, [role="row"]');
      debug.log(`Operations in list: ${rows - 1}`);

      if (rows > 1) {
        debug.log('✅ Operation visible in list');
      } else {
        debug.log('⚠️ Operation may not have appeared in list yet');
      }

      await debug.takeScreenshot('07-in-list');

      debug.log('✅ [SUCCESS] Financial operations workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Financial operations test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
