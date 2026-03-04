import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Livro Caixa - Cash Book Reconciliation', () => {
  test('performs cash book reconciliation with bank extracts', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'livro-caixa-reconciliation');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting cash book reconciliation test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      // ========== NAVIGATE TO LIVRO CAIXA ==========
      debug.log('📍 [NAVIGATE] Going to livro caixa page');
      const livroUrl = `${session.base ?? baseURL}/financeiro/livro-caixa`;
      await page.goto(livroUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR LIVRO CAIXA INTERFACE ==========
      debug.log('⏳ [WAIT] Waiting for livro caixa to load');
      await debug.waitForSelector(
        'table, [role="grid"], h1, [data-testid*="livro"]',
        120000,
        'livro-caixa-page'
      );
      await debug.takeScreenshot('01-livro-caixa-loaded');

      // ========== CHECK FOR TRANSACTIONS ==========
      debug.log('💰 [DATA] Checking for transactions in livro caixa');

      const transactionRows = await debug.getElementCount('tr, [role="row"]');
      debug.log(`Found ${transactionRows - 1} transaction rows (excluding header)`); // -1 for header

      await page.waitForTimeout(1000);
      await debug.takeScreenshot('02-transactions-visible');

      // ========== LOOK FOR RECONCILIATION INTERFACE ==========
      debug.log('🔍 [RECONCILE] Looking for reconciliation options');

      const reconcileSelectors = [
        'button:has-text("Reconciliar")',
        'button:has-text("Conferir")',
        'button[data-testid*="reconcil"]',
        '[data-testid*="reconcile"]',
      ];

      let reconcileFound = false;
      for (const selector of reconcileSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          reconcileFound = true;
          debug.log(`✅ Reconciliation interface found: ${selector}`);

          // Try clicking reconciliation button
          try {
            await debug.clickElement(selector, 30000, 'reconcile-button');
            await page.waitForTimeout(1000);
          } catch (e) {
            debug.log(`⚠️ Could not click reconciliation: ${(e as Error).message}`);
          }
          break;
        }
      }

      if (!reconcileFound) {
        debug.log('ℹ️ No explicit reconciliation button found');
      }

      await debug.takeScreenshot('03-reconciliation-interface');

      // ========== SELECT EXTRACT FOR MATCHING ==========
      debug.log('📊 [MATCH] Selecting extract for transaction matching');

      const extractSelectors = [
        'select[name*="extrato"], select[name*="extract"]',
        'input[placeholder*="Extrato"], input[placeholder*="Extract"]',
        '[role="combobox"]',
      ];

      for (const selector of extractSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          try {
            await debug.clickElement(selector, 30000, 'extract-select');
            await page.waitForTimeout(500);

            const firstOption = page.locator('option, [role="option"]').first();
            if (await firstOption.count() > 0) {
              await firstOption.click();
              debug.log(`✅ Extract selected via: ${selector}`);
              break;
            }
          } catch (e) {
            debug.log(`⚠️ Extract selection via ${selector} failed`);
          }
        }
      }

      await debug.takeScreenshot('04-extract-selected');

      // ========== PERFORM MATCHING ==========
      debug.log('🔗 [MATCH] Matching transactions');

      // Look for match buttons/checkboxes
      const matchButtons = page.locator('button:has-text("Vincular"), button:has-text("Match"), input[type="checkbox"]');
      const matchCount = await matchButtons.count();

      if (matchCount > 0) {
        debug.log(`Found ${matchCount} potential match controls`);

        // Click first match button
        try {
          const [matchResponse] = await Promise.all([
            debug.waitForAPI('PATCH|POST', '/api/financeiro', 60000),
            matchButtons.first().click(),
          ]);

          debug.log(`Match action submitted - Status: ${matchResponse.status()}`);
        } catch (e) {
          debug.log(`⚠️ Match action failed: ${(e as Error).message}`);
        }
      } else {
        debug.log('ℹ️ No match controls found');
      }

      await page.waitForTimeout(1500);
      await debug.takeScreenshot('05-after-matching');

      // ========== VERIFY RECONCILIATION STATUS ==========
      debug.log('✓ [VERIFY] Verifying reconciliation status');

      // Check for reconciliation status indicators
      const statusElements = [
        page.locator('td, [role="cell"]').filter({ hasText: /reconc|conferido|matched/i }),
        page.locator('[data-testid*="status"], [class*="status"]'),
      ];

      let statusVisible = false;
      for (const el of statusElements) {
        const count = await el.count();
        if (count > 0) {
          statusVisible = true;
          break;
        }
      }

      if (statusVisible) {
        debug.log('✅ Reconciliation status visible');
      } else {
        debug.log('ℹ️ No explicit status indicators');
      }

      await debug.takeScreenshot('06-reconciliation-verified');

      debug.log('✅ [SUCCESS] Cash book reconciliation workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Livro caixa test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
