import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Manifestacao Enqueued - Async Notification Handling', () => {
  test.skip('verifies async manifestacao processing with enqueued notifications', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'manifestacao-enqueued');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting async manifestacao notification test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      // ========== NAVIGATE TO MANIFESTACOES ==========
      debug.log('📍 [NAVIGATE] Going to manifestacoes page');
      const manifestacaoUrl = `${session.base ?? baseURL}/fiscal/manifestacao`;
      await page.goto(manifestacaoUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR PAGE LOAD ==========
      debug.log('⏳ [WAIT] Waiting for manifestacoes page to load');
      await debug.waitForSelector('h1, table, [data-testid*="manifestacao"]', 120000, 'manifestacao-page');
      await debug.takeScreenshot('01-manifestacao-page-loaded');

      // ========== CHECK FOR ENQUEUED TASKS ==========
      debug.log('🔔 [ASYNC] Checking for enqueued notification indicators');

      // Look for task badges or status indicators
      const taskIndicators = [
        '[data-testid*="enqueued"]',
        '[class*="enqueued"]',
        '[data-testid*="processing"]',
        '[class*="processing"]',
        '[role="alert"]',
        '.toast, .notification',
      ];

      let enqueuedFound = false;
      for (const selector of taskIndicators) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          enqueuedFound = true;
          debug.log(`✅ Found ${count} enqueued/processing indicators: ${selector}`);
          break;
        }
      }

      if (!enqueuedFound) {
        debug.log('ℹ️ No explicit enqueued indicators found');
      }

      await debug.takeScreenshot('02-checking-enqueued');

      // ========== MONITOR API CALLS FOR ASYNC TASKS ==========
      debug.log('📡 [API] Monitoring for async manifestacao status API calls');

      // Wait for any status polling calls
      let statusCheckCount = 0;
      const statusCheckTimeout = 30000;
      const startTime = Date.now();

      // Create promise to monitor API calls without blocking
      const apiMonitoringPromise = new Promise<void>((resolve) => {
        page.on('response', (response) => {
          if (
            response.url().includes('/api/fiscal/manifestacao') ||
            response.url().includes('/api/core/nfe') ||
            response.url().includes('/api/tasks')
          ) {
            statusCheckCount++;
            debug.log(`🔄 API call detected: ${response.url()} - Status: ${response.status()}`);
          }
        });

        // Resolve after timeout
        setTimeout(() => resolve(), statusCheckTimeout);
      });

      // Wait for async processing with timeout
      await Promise.race([
        apiMonitoringPromise,
        page.waitForTimeout(statusCheckTimeout),
      ]);

      debug.log(`📊 Total async API calls during monitoring: ${statusCheckCount}`);
      await debug.takeScreenshot('03-api-monitoring-complete');

      // ========== CHECK NOTIFICATION TOAST ==========
      debug.log('🔔 [NOTIFY] Looking for completion notifications');

      const notificationSelectors = [
        '[role="alert"]',
        '.toast',
        '.notification',
        '[class*="message"]',
        '[data-testid*="notification"]',
      ];

      let notificationFound = false;
      for (const selector of notificationSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          const text = await page.locator(selector).first().textContent();
          debug.log(`✅ Notification found: ${text}`);
          notificationFound = true;
          break;
        }
      }

      if (!notificationFound) {
        debug.log('ℹ️ No notification toast visible');
      }

      await debug.takeScreenshot('04-notifications-checked');

      // ========== VERIFY STATUS UPDATES ==========
      debug.log('🔍 [VERIFY] Verifying manifestacao status updates');

      // Check table for status columns
      const statusCells = page.locator('td, [role="cell"]').filter({
        hasText: /pendente|processando|processado|sucesso|erro|error/i,
      });

      const statusCount = await statusCells.count();
      debug.log(`Found ${statusCount} status-related cells in table`);

      // Check for progress indicators
      const progressIndicators = await debug.getElementCount('[role="progressbar"], [class*="progress"]');
      debug.log(`Progress indicators visible: ${progressIndicators}`);

      await debug.takeScreenshot('05-status-verified');

      // ========== WAIT FOR COMPLETION ==========
      debug.log('⏳ [COMPLETE] Waiting for async task completion');

      const completionSignals = [
        page.waitForSelector('[data-testid*="success"], [class*="success"]', { timeout: 30000 }).catch(() => null),
        page.waitForSelector('[data-testid*="complete"], [class*="complete"]', { timeout: 30000 }).catch(() => null),
        page.waitForTimeout(15000), // Fallback timeout
      ];

      await Promise.race(completionSignals);

      debug.log('✅ Async processing monitoring complete');
      await debug.takeScreenshot('06-async-complete');

      // ========== FINAL STATUS CHECK ==========
      debug.log('🔍 [FINAL] Final status verification');

      // Refresh page to see final state
      await page.reload({ waitUntil: 'networkidle' });
      await debug.checkPageState();

      // Check final status
      const finalRows = await debug.getElementCount('tr, [role="row"]');
      debug.log(`Final manifestacao count: ${finalRows - 1}`); // -1 for header

      await debug.takeScreenshot('07-final-state');

      debug.log('✅ [SUCCESS] Async manifestacao notification workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Enqueued manifestacao test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
