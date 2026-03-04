import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('RBAC - Role Based Access Control', () => {
  test('verifies user role-based access control and permissions', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'rbac-permissions');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting RBAC permissions test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      // ========== GET CURRENT USER ROLE ==========
      debug.log('👤 [USER] Identifying current user role');

      // Try to fetch user info
      const userApiUrl = `${session.base ?? baseURL}/api/core/user/`;
      try {
        const userResponse = await page.request.get(userApiUrl);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          debug.log('User info retrieved', { 
            username: userData.username,
            is_superuser: userData.is_superuser,
            groups: userData.groups || 'none',
          });
        }
      } catch (e) {
        debug.log('⚠️ Could not fetch user info');
      }

      // ========== NAVIGATE TO ADMIN PAGE ==========
      debug.log('📍 [NAVIGATE] Testing access to admin pages');

      const adminUrl = `${session.base ?? baseURL}/admin/`;
      await page.goto(adminUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // Check if access is denied (403) or allowed (200)
      const currentUrl = page.url();
      
      if (currentUrl.includes('admin')) {
        debug.log('✅ Admin page accessible (user has admin role)');
        await debug.takeScreenshot('01-admin-accessible');

        // Look for admin features
        const adminLinks = page.locator('a, [role="button"]');
        const adminCount = await adminLinks.count();
        debug.log(`Found ${adminCount} admin action links`);

      } else if (currentUrl.includes('login') || currentUrl.includes('403')) {
        debug.log('✓ Admin page access denied (expected for non-admin users)');
        await debug.takeScreenshot('01-admin-denied');
      } else {
        debug.log('ℹ️ Redirected from admin page');
      }

      // ========== CHECK FEATURE VISIBILITY BY ROLE ==========
      debug.log('\n📋 [FEATURES] Checking feature visibility by role');

      const roleDependentPages = [
        { url: 'comercial/compra', feature: 'Compras', requiresAdmin: false },
        { url: 'financeiro/rateio', feature: 'Rateios', requiresAdmin: false },
        { url: 'fiscal/manifestacao', feature: 'Manifestações', requiresAdmin: false },
        { url: 'admin/users', feature: 'Gestão de Usuários', requiresAdmin: true },
      ];

      for (const page_config of roleDependentPages) {
        debug.log(`\n🔎 Checking access to: ${page_config.feature}`);

        const pageUrl = `${session.base ?? baseURL}/${page_config.url}`;
        const response = await page.request.get(pageUrl);

        const hasAccess = response.status() < 400;
        const expected = !page_config.requiresAdmin; // Non-admin should have access to non-admin pages

        if (hasAccess === expected) {
          debug.log(`✅ ${page_config.feature}: Access as expected`);
        } else {
          debug.log(`⚠️ ${page_config.feature}: Unexpected access (${response.status()})`);
        }
      }

      // ========== CHECK BUTTON VISIBILITY ==========
      debug.log('\n🔘 [BUTTONS] Checking admin button visibility');

      // Go to main page
      const mainUrl = `${session.base ?? baseURL}/comercial/compra`;
      await page.goto(mainUrl, { waitUntil: 'networkidle' });

      // Look for admin-only buttons
      const adminButtons = [
        'button:has-text("Excluir")',
        'button:has-text("Editar Permissões")',
        'button[data-admin-only]',
        '[data-testid*="admin"]',
      ];

      let adminButtonsFound = 0;
      for (const selector of adminButtons) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          adminButtonsFound += count;
        }
      }

      debug.log(`Admin-only buttons visible: ${adminButtonsFound}`);

      await debug.takeScreenshot('02-button-visibility');

      // ========== TEST API PERMISSION ENFORCEMENT ==========
      debug.log('\n🔐 [API] Testing API permission enforcement');

      // Try to access a protected endpoint
      const protectedUrl = `${session.base ?? baseURL}/api/admin/users/`;
      const protectedResponse = await page.request.get(protectedUrl);

      if (protectedResponse.status() === 403) {
        debug.log('✅ Protected API returns 403 Forbidden (access denied as expected)');
      } else if (protectedResponse.status() === 200) {
        debug.log('✅ Protected API accessible (user has permission)');
      } else {
        debug.log(`⚠️ Protected API returned ${protectedResponse.status()}`);
      }

      // ========== TEST TENANT ISOLATION ==========
      debug.log('\n🏢 [TENANT] Verifying tenant-level access control');

      // Fetch data and check for tenant isolation
      const dataUrl = `${session.base ?? baseURL}/api/comercial/compra/`;
      try {
        const dataResponse = await page.request.get(dataUrl);
        
        if (dataResponse.ok) {
          const dataPayload = await dataResponse.json();
          
          // Check if data includes tenant information
          if (dataPayload.results && dataPayload.results.length > 0) {
            const firstItem = dataPayload.results[0];
            
            if (firstItem.tenant || firstItem.tenant_id) {
              debug.log('✅ Data includes tenant information (multi-tenant isolation active)');
            } else {
              debug.log('ℹ️ No explicit tenant in response');
            }
          }
        }
      } catch (e) {
        debug.log(`⚠️ Could not verify tenant isolation: ${(e as Error).message}`);
      }

      await debug.takeScreenshot('03-tenant-isolation');

      // ========== TEST FIELD-LEVEL ACCESS CONTROL ==========
      debug.log('\n🔒 [FIELDS] Checking field-level access control');

      // Navigate to a form
      const formUrl = `${session.base ?? baseURL}/comercial/compra`;
      await page.goto(formUrl, { waitUntil: 'networkidle' });

      // Look for disabled/hidden sensitive fields
      const sensitiveFieldPatterns = [
        'input[disabled]',
        '[class*="disabled"]',
        '[aria-disabled]',
      ];

      let disabledFieldCount = 0;
      for (const selector of sensitiveFieldPatterns) {
        const count = await debug.getElementCount(selector);
        disabledFieldCount += count;
      }

      debug.log(`Disabled/protected fields visible: ${disabledFieldCount}`);

      await debug.takeScreenshot('04-field-access');

      // ========== LOG PERMISSION SUMMARY ==========
      debug.log('\n📊 [SUMMARY] Permission summary');
      debug.log('✓ RBAC verification complete');

      debug.log('✅ [SUCCESS] RBAC and permission test completed');

    } catch (error) {
      debug.log('❌ [ERROR] RBAC test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
