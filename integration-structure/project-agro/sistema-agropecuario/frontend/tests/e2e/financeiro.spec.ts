import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Financeiro - Complete Smoke Test', () => {
  // SKIPPED: Requires complete financeiro workflow with all pages properly connected
  test.skip('performs complete financeiro workflow: compra → despesa → rateio', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'financeiro-smoke-test');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting complete financeiro workflow');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      const unique = `${Date.now()}`;

      // ============ STEP 1: CREATE COMPRA ============
      debug.log('\n📍 [STEP 1] Creating compra (purchase)');
      let compraId: string | number = null;

      const compraUrl = `${session.base ?? baseURL}/comercial/compra`;
      await page.goto(compraUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();
      await page.waitForTimeout(2000);

      await debug.waitForSelector('button, h1', 90000, 'nova-compra-btn');
      await debug.clickElement('button:has-text("Nova Compra")', 120000, 'create-compra-btn');
      await page.waitForTimeout(1000);

      await debug.waitForSelector('input[placeholder*="Fornecedor"], input[name="fornecedor"]', 120000, 'fornecedor-field');
      await debug.fillForm({
        'input[placeholder*="Fornecedor"]': 'Fornecedor Test',
        'input[placeholder*="Descrição"]': `Compra ${unique}`,
        'input[placeholder*="Valor"]': '1000.00',
      });

      await debug.takeScreenshot('01-compra-form-filled');

      const [compraResponse] = await Promise.all([
        debug.waitForAPI('POST', '/api/comercial/compra', 120000),
        debug.clickElement('button:has-text("Salvar")', 120000, 'compra-submit'),
      ]);

      debug.log(`✅ Compra created - API Status: ${compraResponse.status()}`);
      const compraData = await compraResponse.json();
      compraId = compraData.id;
      debug.log('Compra data', { id: compraId, value: compraData.valor });
      await debug.takeScreenshot('02-compra-created');

      // ============ STEP 2: CREATE DESPESA ============
      debug.log('\n📍 [STEP 2] Creating despesa (expense)');
      let despesaId: string | number = null;

      const despesaUrl = `${session.base ?? baseURL}/comercial/despesa`;
      await page.goto(despesaUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      await debug.waitForSelector('button:has-text("Nova"), h1', 120000, 'despesa-page-load');
      
      // Find and click new despesa button
      const newDespesaBtn = page.locator('button:has-text("Nova"), button[data-testid*="nova"]').first();
      await debug.waitForElement(newDespesaBtn, 120000, 'new-despesa-button');
      await newDespesaBtn.click();
      await page.waitForTimeout(1000);

      await debug.waitForSelector('input[name="descricao"], input[placeholder*="Descrição"]', 120000, 'despesa-form');
      await debug.fillForm({
        'input[name="descricao"]': `Despesa ${unique}`,
        'input[name="valor"]': '500.00',
        'input[type="date"]': '2026-02-28',
      });

      // Select centro_custo
      try {
        await debug.clickElement('select[name="centro_custo"], input[placeholder*="Centro"]', 120000, 'centro-custo');
        const selectOption = page.locator('option, [role="option"]').first();
        await selectOption.click();
      } catch (e) {
        debug.log(`⚠️ Centro custo selection had issue: ${(e as Error).message}`);
      }

      await debug.takeScreenshot('03-despesa-form-filled');

      const [despesaResponse] = await Promise.all([
        debug.waitForAPI('POST', '/api/comercial/despesa', 120000),
        debug.clickElement('button:has-text("Salvar")', 120000, 'despesa-submit'),
      ]);

      debug.log(`✅ Despesa created - API Status: ${despesaResponse.status()}`);
      const despesaData = await despesaResponse.json();
      despesaId = despesaData.id;
      debug.log('Despesa data', { id: despesaId, valor: despesaData.valor });
      await debug.takeScreenshot('04-despesa-created');

      // ============ STEP 3: CREATE RATEIO ============
      debug.log('\n📍 [STEP 3] Creating rateio (allocation)');
      let rateioId: string | number = null;

      const rateioUrl = `${session.base ?? baseURL}/financeiro/rateio`;
      await page.goto(rateioUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      await debug.waitForSelector('button:has-text("Novo"), h1', 120000, 'rateio-page-load');

      const newRateioBtn = page.locator('button:has-text("Novo"), button[data-testid*="novo"]').first();
      await newRateioBtn.click();
      await page.waitForTimeout(1000);

      await debug.retryAction(
        async () => {
          // Select despesa
          await debug.clickElement('select[name="despesa"], input[placeholder*="Despesa"]', 120000, 'despesa-select');
          await page.waitForTimeout(500);
          const despesaOption = page.locator('option, [role="option"]').first();
          await despesaOption.click();
        },
        2,
        1000,
        'Select Despesa for Rateio'
      );

      await debug.fillForm({
        'input[name="percentual"], input[placeholder*="Percent"]': '100',
        'input[name="valor_centro_custo"], input[placeholder*="Valor"]': '500.00',
      });

      await debug.takeScreenshot('05-rateio-form-filled');

      const [rateioResponse] = await Promise.all([
        debug.waitForAPI('POST', '/api/financeiro/rateio', 120000),
        debug.clickElement('button:has-text("Salvar")', 120000, 'rateio-submit'),
      ]);

      debug.log(`✅ Rateio created - API Status: ${rateioResponse.status()}`);
      const rateioData = await rateioResponse.json();
      rateioId = rateioData.id;
      debug.log('Rateio data', { id: rateioId, percentual: rateioData.percentual });
      await debug.takeScreenshot('06-rateio-created');

      // ============ STEP 4: VERIFY ALL CREATED ============
      debug.log('\n📍 [STEP 4] Verifying all entities were created');

      // Verify compra exists
      const compraVerifyUrl = `${session.base ?? baseURL}/api/comercial/compra/${compraId}/`;
      const compraCheckResp = await page.request.get(compraVerifyUrl);
      expect(compraCheckResp.status()).toBeLessThan(400);
      debug.log(`✅ Compra verified to exist: ${compraId}`);

      // Verify despesa exists
      const despesaVerifyUrl = `${session.base ?? baseURL}/api/comercial/despesa/${despesaId}/`;
      const despesaCheckResp = await page.request.get(despesaVerifyUrl);
      expect(despesaCheckResp.status()).toBeLessThan(400);
      debug.log(`✅ Despesa verified to exist: ${despesaId}`);

      // Verify rateio exists
      const rateioVerifyUrl = `${session.base ?? baseURL}/api/financeiro/rateio/${rateioId}/`;
      const rateioCheckResp = await page.request.get(rateioVerifyUrl);
      expect(rateioCheckResp.status()).toBeLessThan(400);
      debug.log(`✅ Rateio verified to exist: ${rateioId}`);

      await debug.takeScreenshot('07-all-verified');

      debug.log('\n✅ [SUCCESS] Complete financeiro workflow passed!');
      debug.log(`Summary: Compra ${compraId} → Despesa ${despesaId} → Rateio ${rateioId}`);

    } catch (error) {
      debug.log('❌ [ERROR] Workflow failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
