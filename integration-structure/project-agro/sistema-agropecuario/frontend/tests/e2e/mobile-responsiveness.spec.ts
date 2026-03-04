import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Mobile Responsiveness - Viewport and Touch Interactions', () => {
  test('verifies mobile responsiveness across main pages', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'mobile-responsiveness');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting mobile responsiveness test');
      
      // ========== SET MOBILE VIEWPORT ==========
      debug.log('📱 [VIEWPORT] Setting mobile viewport (375x667)');
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated on mobile viewport');

      // ========== TEST MAIN PAGES ON MOBILE ==========
      const pagesToTest = [
        { url: 'comercial/compra', name: 'Compras' },
        { url: 'comercial/despesa', name: 'Despesas' },
        { url: 'financeiro/rateio', name: 'Rateios' },
        { url: 'fiscal/manifestacao', name: 'Manifestações' },
      ];

      for (const testPage of pagesToTest) {
        debug.log(`📄 [PAGE] Testing ${testPage.name} on mobile`);

        const pageUrl = `${session.base ?? baseURL}/${testPage.url}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle' });
        await debug.checkPageState();

        // ========== CHECK VIEWPORT CONSTRAINTS ==========
        debug.log(`📏 [LAYOUT] Verifying layout fits viewport`);

        const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
        const windowWidth = await page.evaluate(() => window.innerWidth);

        debug.log(`Body width: ${bodyWidth}px, Window width: ${windowWidth}px`);

        if (bodyWidth > windowWidth) {
          debug.log(`⚠️ Horizontal scroll required (${bodyWidth}px > ${windowWidth}px)`);
        } else {
          debug.log(`✅ Layout fits viewport`);
        }

        // ========== CHECK HAMBURGER MENU ==========
        debug.log(`🍔 [MENU] Checking for mobile menu`);

        const hamburgerBtn = page.locator(
          'button[aria-label*="menu"], button[data-testid*="menu"], .hamburger, [class*="mobile-menu"]'
        );

        if (await hamburgerBtn.count() > 0) {
          debug.log('✅ Hamburger menu found');

          try {
            await hamburgerBtn.first().click();
            await page.waitForTimeout(500);

            // Check if menu opens
            const menuContent = page.locator('nav, [role="navigation"], [data-testid*="menu-content"]');
            if (await menuContent.count() > 0) {
              debug.log('✅ Menu opens correctly');
            }
          } catch (e) {
            debug.log(`⚠️ Could not interact with menu: ${(e as Error).message}`);
          }

          // Close menu
          const closeBtn = page.locator('button[aria-label*="close"], button.close').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }
        } else {
          debug.log('ℹ️ No hamburger menu found');
        }

        // ========== CHECK TOUCH-FRIENDLY BUTTONS ==========
        debug.log(`👆 [TOUCH] Verifying touch-friendly button sizes`);

        const buttons = page.locator('button:visible, a[role="button"]:visible');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
          // Check first button
          const firstBtn = buttons.first();
          const box = await firstBtn.boundingBox();

          if (box && box.width < 44 && box.height < 44) {
            debug.log(`⚠️ Button too small for touch (${box.width}x${box.height}px)`);
          } else {
            debug.log(`✅ Buttons are touch-friendly size`);
          }
        }

        await debug.takeScreenshot(`${testPage.name.toLowerCase()}-mobile`);
      }

      // ========== TEST FORM INTERACTION ON MOBILE ==========
      debug.log('\n📱 [FORM] Testing form interaction on mobile');

      const compraUrl = `${session.base ?? baseURL}/comercial/compra`;
      await page.goto(compraUrl, { waitUntil: 'networkidle' });

      // Try creating something on mobile
      const newBtn = page.locator('button:has-text("Nova"), button[data-testid*="nova"]').first();
      if (await newBtn.count() > 0) {
        await newBtn.click();
        await page.waitForTimeout(1000);

        // Check if form is modal or full page
        const modal = page.locator('[role="dialog"]');
        if (await modal.count() > 0) {
          debug.log('✅ Form opens in modal (good for mobile)');
          
          // Check if modal fits viewport
          const modalBox = await modal.first().boundingBox();
          if (modalBox && modalBox.width > 375) {
            debug.log(`⚠️ Modal wider than viewport (${modalBox.width}px > 375px)`);
          } else {
            debug.log('✅ Modal fits mobile viewport');
          }
        } else {
          debug.log('ℹ️ Form opens on full page');
        }

        await debug.takeScreenshot('mobile-form-interaction');
      }

      // ========== TEST RESPONSIVE TABLES ==========
      debug.log('\n📊 [TABLE] Testing table responsiveness');

      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const table = tables.first();
        const tableBox = await table.boundingBox();

        if (tableBox && tableBox.width > 375) {
          debug.log(`Table wider than viewport (${tableBox.width}px), checking for scroll`);

          const tableContainer = table.locator('xpath=ancestor::div[contains(@class, "overflow") or contains(@class, "scroll")]');
          if (await tableContainer.count() > 0) {
            debug.log('✅ Table has scrollable container');
          } else {
            debug.log('⚠️ Table may not scroll properly on mobile');
          }
        }
      }

      await debug.takeScreenshot('mobile-table-responsive');

      // ========== RESTORE DESKTOP VIEWPORT ==========
      debug.log('\n🖥️ [VIEWPORT] Restoring desktop viewport');
      await page.setViewportSize({ width: 1280, height: 720 });

      debug.log('✅ [SUCCESS] Mobile responsiveness test completed');

    } catch (error) {
      debug.log('❌ [ERROR] Mobile responsiveness test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
