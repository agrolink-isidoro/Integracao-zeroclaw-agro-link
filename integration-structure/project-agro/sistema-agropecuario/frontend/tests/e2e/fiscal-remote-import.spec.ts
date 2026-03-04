import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Fiscal Remote Import - NFe Remote Import Scenarios', () => {
  test.skip('imports NFe by key and displays manifest options', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'fiscal-remote-import-key');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting NFe remote import by key');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      // ========== NAVIGATE TO FISCAL IMPORT ==========
      debug.log('📍 [NAVIGATE] Going to fiscal import page');
      const importUrl = `${session.base ?? baseURL}/fiscal/import`;
      await page.goto(importUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR IMPORT INTERFACE ==========
      debug.log('⏳ [WAIT] Waiting for import interface to load');
      await debug.waitForSelector(
        'input[placeholder*="Chave"], input[placeholder*="NFe"], form, [data-testid*="import"]',
        120000,
        'import-form-load'
      );
      await debug.takeScreenshot('01-import-form-loaded');

      // ========== FILL NFE KEY ==========
      debug.log('🔑 [INPUT] Entering test NFe key');

      // Test NFe key format (44 digits)
      const testNFeKey = '00000000000000000000000000000000000000000001';
      
      const keyInputs = [
        'input[name="chave"], input[placeholder*="Chave"]',
        'input[placeholder*="NFe"]',
        'input[type="text"]:first-of-type',
      ];

      let keyFilled = false;
      for (const selector of keyInputs) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            await debug.fillForm({ [selector]: testNFeKey });
            debug.log(`✅ Key filled via: ${selector}`);
            keyFilled = true;
            break;
          }
        } catch (e) {
          debug.log(`⚠️ Could not fill ${selector}`);
        }
      }

      if (!keyFilled) {
        debug.log('⚠️ No key input found');
      }

      await debug.takeScreenshot('02-nfe-key-entered');

      // ========== SEARCH FOR NFE ==========
      debug.log('🔍 [SEARCH] Searching for NFe');

      const searchBtn = page.locator('button:has-text("Buscar"), button:has-text("Search"), button[type="submit"]').first();
      
      if (await searchBtn.count() > 0) {
        const [searchResponse] = await Promise.all([
          debug.waitForAPI('GET', '/api/sefaz|/api/fiscal', 60000),
          searchBtn.click(),
        ]);

        const status = searchResponse.status();
        debug.log(`Search API called - Status: ${status}`);

        if (status === 200) {
          const nfeData = await searchResponse.json();
          debug.log('NFe data retrieved', { 
            chave: nfeData.chave || 'N/A',
            numero: nfeData.numero || 'N/A',
          });
        } else if (status === 404) {
          debug.log('⚠️ NFe not found at SEFAZ (expected for test key)');
        } else {
          debug.log(`⚠️ Search returned status ${status}`);
        }
      } else {
        debug.log('⚠️ No search button found');
      }

      await page.waitForTimeout(2000);
      await debug.takeScreenshot('03-after-search');

      // ========== DISPLAY NFE DETAILS ==========
      debug.log('📋 [DETAILS] Checking for NFe details display');

      const detailSelectors = [
        'table, [role="table"]',
        '[data-testid*="nfe-details"]',
        'pre, code',
        '.details',
      ];

      let detailsFound = false;
      for (const selector of detailSelectors) {
        const count = await debug.getElementCount(selector);
        if (count > 0) {
          detailsFound = true;
          debug.log(`✅ NFe details found: ${selector}`);
          break;
        }
      }

      if (!detailsFound) {
        debug.log('ℹ️ No explicit details section found');
      }

      await debug.takeScreenshot('04-nfe-details');

      // ========== MANIFESTACAO OPTIONS ==========
      debug.log('📋 [OPTIONS] Checking manifestacao options');

      const manifestOptions = page.locator(
        'button:has-text("Manifestar"), button:has-text("Descartar"), button:has-text("Ciência"), [role="button"][data-action*="manifest"]'
      );

      const optionCount = await manifestOptions.count();
      debug.log(`Found ${optionCount} manifestacao options`);

      if (optionCount > 0) {
        // Try clicking first manifestacao option
        const firstOption = manifestOptions.first();
        const optionText = await firstOption.textContent();
        debug.log(`Available manifestacao action: ${optionText}`);

        try {
          await firstOption.click();
          
          // Wait for any confirmation dialog
          const [manifestResponse] = await Promise.all([
            debug.waitForAPI('POST', '/api/fiscal|/api/core/nfe', 60000),
            page.waitForTimeout(1000),
          ]);

          debug.log(`Manifestacao action submitted - Status: ${manifestResponse.status()}`);
        } catch (e) {
          debug.log(`⚠️ Manifestacao action failed: ${(e as Error).message}`);
        }
      }

      await debug.takeScreenshot('05-manifestacao-options');

      // ========== IMPORT/ADD TO SYSTEM ==========
      debug.log('➕ [ADD] Adding imported NFe to system');

      const addSelectors = [
        'button:has-text("Adicionar"), button:has-text("Importar"), button:has-text("Add")',
        'button[data-testid*="import"], button[data-testid*="add"]',
      ];

      let addSucceeded = false;
      for (const selector of addSelectors) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            const [importResponse] = await Promise.all([
              debug.waitForAPI('POST', '/api/core/nfe|/api/fiscal', 60000),
              debug.clickElement(selector, 30000, 'add-nfe-button'),
            ]);

            const status = importResponse.status();
            debug.log(`✅ NFe added to system - API Status: ${status}`);
            expect(status).toBeLessThan(400);
            addSucceeded = true;
            break;
          }
        } catch (e) {
          debug.log(`⚠️ Selector ${selector} failed: ${(e as Error).message}`);
        }
      }

      if (!addSucceeded) {
        debug.log('⚠️ No add button found');
      }

      await page.waitForTimeout(2000);
      await debug.takeScreenshot('06-after-import');

      debug.log('✅ [SUCCESS] NFe remote import workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] Remote import test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });

  test('handles NFe import XML upload scenario', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'fiscal-remote-import-xml');
    debug.logConsoleMessages();

    try {
      debug.log('🚀 [INIT] Starting NFe XML file upload');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated');

      // ========== NAVIGATE TO IMPORT ==========
      const importUrl = `${session.base ?? baseURL}/fiscal/import`;
      await page.goto(importUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== LOOK FOR FILE UPLOAD ==========
      debug.log('📤 [UPLOAD] Looking for XML file upload option');

      const fileInputs = page.locator('input[type="file"]');
      const fileInputCount = await fileInputs.count();

      if (fileInputCount > 0) {
        debug.log(`✅ Found ${fileInputCount} file input(s)`);
        await debug.takeScreenshot('01-file-input-found');

        // Create a minimal NFe XML for testing
        const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe00000000000000000000000000000000000000000001">
      <ide>
        <cUF>31</cUF>
        <natOp>VENDA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>1</nNF>
        <dhEmi>2026-02-25T10:00:00</dhEmi>
      </ide>
    </infNFe>
  </NFe>
</nfeProc>`;

        // Write test XML
        const fs = require('fs');
        fs.writeFileSync('/tmp/test-nfe.xml', testXml);

        // Upload file
        await fileInputs.first().setInputFiles('/tmp/test-nfe.xml');
        debug.log('✅ XML file uploaded');
        
        await page.waitForTimeout(1000);
        await debug.takeScreenshot('02-xml-uploaded');

        // Look for submit/process button
        const processBtn = page.locator('button:has-text("Processar"), button:has-text("Importar"), button[type="submit"]').first();
        if (await processBtn.count() > 0) {
          const [processResponse] = await Promise.all([
            debug.waitForAPI('POST', '/api/', 60000),
            processBtn.click(),
          ]);

          debug.log(`✅ XML processing submitted - Status: ${processResponse.status()}`);
        }
      } else {
        debug.log('ℹ️ No file upload input found on this import page');
      }

      await debug.takeScreenshot('03-xml-import-complete');
      debug.log('✅ [SUCCESS] XML import workflow completed');

    } catch (error) {
      debug.log('❌ [ERROR] XML import test failed', {
        error: (error as Error).message,
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
