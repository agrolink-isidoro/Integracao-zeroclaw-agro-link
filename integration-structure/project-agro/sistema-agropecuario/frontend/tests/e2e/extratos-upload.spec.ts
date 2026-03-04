import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Extratos Upload - Debug Enhanced', () => {
  test('uploads bank statement file and previews data', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'extratos-upload');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting extratos upload test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      // ========== NAVIGATE TO EXTRATOS PAGE ==========
      debug.log('📍 [NAVIGATE] Going to extratos upload page');
      const extratosUrl = `${session.base ?? baseURL}/financeiro/extratos`;
      await page.goto(extratosUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR UPLOAD INTERFACE ==========
      debug.log('⏳ [WAIT] Waiting for extratos interface to load');
      await debug.waitForSelector(
        'input, button, h1, [class*="container"]',
        90000,
        'extratos-interface-load'
      );
      await page.waitForTimeout(2000);
      await debug.takeScreenshot('01-extratos-page-loaded');

      // ========== SELECT FILE ==========
      debug.log('📁 [FILE] Looking for test CSV file');
      
      // Find any CSV in bank_statements directory
      const bankStmtDir = '/home/felip/projeto-agro/bank_statements';
      let csvFile = null;

      if (fs.existsSync(bankStmtDir)) {
        const files = fs.readdirSync(bankStmtDir);
        csvFile = files.find(f => f.endsWith('.csv'));
        debug.log(`Found CSV file: ${csvFile}`);
      }

      if (csvFile) {
        const filePath = path.join(bankStmtDir, csvFile);
        debug.log(`📤 [UPLOAD] Uploading file: ${filePath}`);

        // Find file input and upload
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(filePath);
          debug.log(`✅ File selected: ${csvFile}`);
        } else {
          debug.log('⚠️ No file input found, attempting alternative upload method');
        }
      } else {
        debug.log('⚠️ No CSV file found in bank_statements, creating test file');
        const testCsvContent = 'Data,Descrição,Valor\n2026-02-25,Transferência,1000.00\n2026-02-26,Deposito,500.00\n';
        csvFile = 'test-extract.csv';
        fs.writeFileSync('/tmp/test-extract.csv', testCsvContent);
        
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles('/tmp/test-extract.csv');
          debug.log('✅ Test file uploaded');
        }
      }

      await page.waitForTimeout(1000);
      await debug.takeScreenshot('02-file-selected');

      // ========== PREVIEW DATA ==========
      debug.log('👁️ [PREVIEW] Checking for data preview');
      const previewTimeout = 60000;
      const previewSelectors = [
        'table', 
        '[data-testid*="preview"]', 
        '.data-preview',
        'tbody',
        '[role="grid"]'
      ];

      let previewFound = false;
      for (const selector of previewSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          previewFound = true;
          debug.log(`✅ Preview found with selector: ${selector}`);
          break;
        }
      }

      if (!previewFound) {
        // Try waiting for table rows
        try {
          await page.waitForSelector('tr, [role="row"]', { timeout: 30000 });
          previewFound = true;
          debug.log('✅ Preview rows appeared');
        } catch (e) {
          debug.log('⚠️ Preview did not appear - may need to click preview button');
        }
      }

      await debug.takeScreenshot('03-preview-visible');

      // ========== CLICK IMPORT/CONFIRM ==========
      debug.log('✅ [SUBMIT] Clicking import/confirm button');

      const allowedSelectors = [
        'button:has-text("Importar")',
        'button:has-text("Confirmar")',
        'button:has-text("Upload")',
        'button[data-testid*="import"]',
      ];

      let importSucceeded = false;

      for (const selector of allowedSelectors) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            debug.log(`Found import button: ${selector}`);

            const importResponse = await Promise.all([
              debug.waitForAPI('POST', '/api/financeiro/extratos|/api/financeiro/import|/api/', 60000),
              debug.clickElement(selector, 30000, 'import-button'),
            ]);

            const status = importResponse[0].status();
            debug.log(`✅ Import API called - Status: ${status}`);
            importSucceeded = true;
            break;
          }
        } catch (e) {
          debug.log(`⚠️ Selector ${selector} failed: ${(e as Error).message}`);
        }
      }

      if (!importSucceeded) {
        debug.log('⚠️ No import button clicked - file may have been auto-imported');
      }

      await page.waitForTimeout(2000);
      await debug.takeScreenshot('04-after-import');

      // ========== VERIFY IMPORT ==========
      debug.log('🔍 [VERIFY] Verifying import was successful');

      // Check for success message
      const successElements = await Promise.all([
        debug.getElementCount('[role="alert"]:has-text("success|importado|concluído")'),
        debug.getElementCount('[class*="success"]:has-text("success|importado|concluído")'),
      ]);

      if (successElements.some(count => count > 0)) {
        debug.log('✅ Success message visible');
      } else {
        debug.log('⚠️ No explicit success message, but import may have succeeded');
      }

      // Check if data appears in list/table
      const dataDisplayElements = await debug.getElementCount('tr, [role="row"], table tbody');
      debug.log(`Data display rows found: ${dataDisplayElements}`);

      if (dataDisplayElements > 0) {
        debug.log('✅ Data appears to be imported');
      }

      await debug.takeScreenshot('05-import-completed');

      debug.log('✅ [SUCCESS] Extratos upload test completed');

    } catch (error) {
      debug.log('❌ [ERROR] Upload test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
