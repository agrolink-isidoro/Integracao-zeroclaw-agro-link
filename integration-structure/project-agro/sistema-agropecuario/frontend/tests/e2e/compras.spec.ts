import { test, expect } from '@playwright/test';
import { ensureLoggedInPage } from './helpers';
import { DebugHelper } from './debug-helpers';

test.describe('Compras - Debug Enhanced', () => {
  test('user can create compra via UI', async ({ page, baseURL }) => {
    const debug = new DebugHelper(page, 'compras-create');
    debug.logConsoleMessages();

    try {
      // ========== AUTH & SETUP ==========
      debug.log('🚀 [INIT] Starting compra creation test');
      const session = await ensureLoggedInPage(page);
      debug.log('✅ [AUTH] User authenticated', { base: session.base });

      await debug.checkPageState();

      // ========== NAVIGATE TO COMPRAS ==========
      debug.log('📍 Navigating to compras page');
      const comprasUrl = `${session.base ?? baseURL}/comercial/compras`;
      await page.waitForTimeout(2000); await page.goto(comprasUrl, { waitUntil: 'networkidle' });
      await debug.checkPageState();

      // ========== WAIT FOR PAGE LOAD ==========
      debug.log('⏳ [WAIT] Waiting for compras page to load...');
      await debug.waitForSelector('[data-testid="compras-list"], h1, .page-header', 120000, 'compras-page-load');

      // Take initial screenshot
      await debug.takeScreenshot('01-compras-page-loaded');

      // ========== CREATE FORNECEDOR ==========
      debug.log('🔨 [CREATE] Creating fornecedor dependency');
      const unique = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
      const cpf_cnpj = `${String(unique).slice(-5)}.888.${String(unique).slice(-3)}/0001-88`;

      const fornecedorPayload = {
        tipo_pessoa: 'pj',
        cpf_cnpj,
        razao_social: `E2E Fornecedor ${unique}`,
        categoria_fornecedor: 'insumos',
        status: 'ativo',
        endereco_logradouro: 'Rua E2E',
        endereco_numero: '1',
        endereco_bairro: 'Centro',
        endereco_cidade: 'TestCity',
        endereco_estado: 'SP',
        endereco_cep: '00000-000',
        contato_telefone_principal: '11999990000',
        contato_email_principal: `fornecedor.e2e.${unique}@test.com`,
      };

      debug.log('📤 Creating fornecedor via API', { cpf_cnpj });
      const fornecedorRes = await page.request.post(`${session.base}/api/comercial/fornecedores/`, {
        data: fornecedorPayload,
        headers: session.headers,
      });

      debug.log(`API Response Status: ${fornecedorRes.status()}`);
      const fornecedorData = await fornecedorRes.json();

      if (fornecedorRes.status() === 400 && fornecedorData.cpf_cnpj) {
        debug.log('⚠️ Fornecedor already exists (CPF duplicate), using existing');
      } else if (fornecedorRes.status() >= 400) {
        debug.log('❌ Failed to create fornecedor', { status: fornecedorRes.status(), error: fornecedorData });
        throw new Error(`Fornecedor creation failed: ${fornecedorRes.status()}`);
      }

      const fornecedorId = fornecedorData.id;
      debug.log('✅ Fornecedor ready', { id: fornecedorId, name: fornecedorData.razao_social });

      // ========== CLICK "NOVA COMPRA" BUTTON ==========
      debug.log('🖱️ [CLICK] Looking for "Nova Compra" button');
      await page.waitForTimeout(3000);
      
      await debug.retryAction(
        async () => {
          // Try to find and click button - very aggressive approach
          const buttons = page.locator('button');
          const count = await buttons.count();
          debug.log(`Found ${count} buttons on page`);
          
          // Try each button
          for (let i = 0; i < Math.min(20, count); i++) {
            try {
              const btn = buttons.nth(i);
              const text = (await btn.textContent({ timeout: 500 }).catch(() => '')).toLowerCase();
              debug.log(`Button ${i}: "${text.substring(0, 20)}"`);
              
              if (text.includes('compra') || text.includes('nova') || text.includes('new') || text.includes('adicionar') || text.includes('criar')) {
                debug.log(`Attempting click on button ${i}`);
                await page.waitForTimeout(500);
                await btn.click({ force: true, timeout: 5000 });
                await page.waitForTimeout(2000);
                debug.log(`✅ Clicked button with text: "${text.substring(0, 30)}"`);
                return; // Success!
              }
            } catch (e) {
              debug.log(`Button ${i} click error (continuing): ${(e as Error).message}`);
            }
          }
          
          throw new Error('Could not find Nova Compra button after checking all buttons');
        },
        3,
        3000,
        'Click Nova Compra'
      );

      await debug.takeScreenshot('02-after-click-nova-compra');

      // ========== FILL COMPRA FORM ==========
      debug.log('📝 [FORM] Filling compra form fields');
      const formData = {
        'input[name="data"], input[placeholder*="Data"], input[type="date"]': '2026-02-28',
        'input[name="valor"], input[placeholder*="Valor"]': '1000.00',
      };

      // Try to fill optional fields with retries
      for (const [selector, value] of Object.entries(formData)) {
        try {
          const count = await debug.getElementCount(selector);
          if (count > 0) {
            await debug.fillForm({ [selector]: value });
          } else {
            debug.log(`⚠️ Field not found: ${selector}`);
          }
        } catch (e) {
          debug.log(`⚠️ Field fill error (non-critical): ${selector}`, { error: (e as Error).message });
        }
      }

      // ========== SELECT FORNECEDOR ==========
      debug.log('🔍 [SELECT] Selecting fornecedor from dropdown');
      await debug.retryAction(
        async () => {
          await debug.clickElement('select[name="fornecedor"], input[placeholder*="Fornecedor"]', 120000, 'fornecedor-field');
          await page.waitForTimeout(500);
          // Try to find and select the fornecedor
          await debug.clickElement(`option[value="${fornecedorId}"], [data-value="${fornecedorId}"], text=${fornecedorData.razao_social}`, 120000, 'fornecedor-option');
        },
        2,
        1500,
        'Select Fornecedor'
      );

      await debug.takeScreenshot('03-form-filled');

      // ========== SUBMIT FORM ==========
      debug.log('✅ [SUBMIT] Submitting compra form');
      const submitResponse = await Promise.all([
        debug.waitForAPI('POST', '/api/comercial/compras/', 120000),
        debug.clickElement('button:has-text("Salvar"), button:has-text("Submit"), button[type="submit"]', 120000, 'submit-button'),
      ]);

      debug.log(`✅ Compra created - API Status: ${submitResponse[0].status()}`);
      await debug.takeScreenshot('04-compra-created');

      // ========== VERIFY CREATION ==========
      debug.log('🔍 [VERIFY] Verifying compra was created');
      await page.waitForTimeout(1000);

      const responseBody = await submitResponse[0].json();
      debug.log('✅ [SUCCESS] Compra creation successful', {
        id: responseBody.id,
        status: responseBody.status || 'pendente',
        valor: responseBody.valor,
      });

      expect(submitResponse[0].status()).toBeLessThan(400);

      debug.log('✅ Test completed successfully');
      debug.log(debug.getSummary());
    } catch (error) {
      debug.log('❌ [ERROR] Test failed', {
        error: (error as Error).message,
        stack: (error as Error).stack?.split('\n').slice(0, 5).join('\n'),
      });
      await debug.takeScreenshot('error-final-state');
      throw error;
    }
  });
});
