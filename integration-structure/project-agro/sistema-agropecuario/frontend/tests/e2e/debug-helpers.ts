/**
 * Debug Helpers for E2E Tests
 * Provides comprehensive logging, screenshots, and error tracking
 */
import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export class DebugHelper {
  private page: Page;
  private testName: string;
  private screenshotDir: string;
  private logFile: string;

  constructor(page: Page, testName: string) {
    this.page = page;
    this.testName = testName;
    this.screenshotDir = path.join('/tmp/e2e-debug', testName.replace(/\s+/g, '_'));
    this.logFile = path.join(this.screenshotDir, 'debug.log');

    // Create directories
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`📝 ${logMessage}`, data || '');
    fs.appendFileSync(this.logFile, `${logMessage}\n${data ? JSON.stringify(data, null, 2) : ''}\n`);
  }

  async takeScreenshot(name: string) {
    try {
      const filename = path.join(this.screenshotDir, `${name}-${Date.now()}.png`);
      await this.page.screenshot({ path: filename, fullPage: true });
      this.log(`Screenshot taken: ${filename}`);
    } catch (e) {
      this.log(`Failed to take screenshot: ${name}`, e);
    }
  }

  async waitForSelector(selector: string, timeout = 60000, name?: string) {
    this.log(`⏳ Waiting for selector: "${selector}" (${timeout}ms)`, { name });
    try {
      await this.page.waitForSelector(selector, { timeout });
      this.log(`✅ Found selector: "${selector}"`);
    } catch (e) {
      this.log(`❌ TIMEOUT waiting for selector: "${selector}"`, {
        error: (e as Error).message,
        timeout,
        name,
      });
      await this.takeScreenshot(`timeout-selector-${name || selector.slice(0, 20)}`);
      throw e;
    }
  }

  async waitForElement(locator: any, timeout = 60000, name?: string) {
    this.log(`⏳ Waiting for element: ${name || locator} (${timeout}ms)`);
    try {
      await locator.waitFor({ timeout });
      this.log(`✅ Element visible: ${name || locator}`);
    } catch (e) {
      this.log(`❌ TIMEOUT waiting for element: ${name || locator}`, {
        error: (e as Error).message,
        timeout,
      });
      await this.takeScreenshot(`timeout-element-${name?.replace(/\s+/g, '_') || 'unknown'}`);
      throw e;
    }
  }

  async fillForm(data: Record<string, string>) {
    for (const [selector, value] of Object.entries(data)) {
      this.log(`📝 Filling form field: ${selector} = "${value}"`);
      try {
        await this.page.fill(selector, value);
        this.log(`✅ Filled: ${selector}`);
      } catch (e) {
        this.log(`❌ Failed to fill ${selector}`, { error: (e as Error).message });
        await this.takeScreenshot(`fill-error-${selector.slice(0, 20)}`);
        throw e;
      }
    }
  }

  async clickElement(selector: string, timeout = 60000, name?: string) {
    this.log(`🖱️ Clicking: "${selector}" (${timeout}ms)`, { name });
    try {
      await this.page.waitForSelector(selector, { timeout });
      await this.page.click(selector);
      this.log(`✅ Clicked: "${selector}"`);
    } catch (e) {
      this.log(`❌ Failed to click "${selector}"`, {
        error: (e as Error).message,
        timeout,
        name,
      });
      await this.takeScreenshot(`click-error-${name?.replace(/\s+/g, '_') || selector.slice(0, 20)}`);
      throw e;
    }
  }

  async waitForNavigation(actionFn: () => Promise<void>, timeout = 30000) {
    this.log(`🔗 Waiting for navigation (${timeout}ms)`);
    try {
      await Promise.all([
        this.page.waitForNavigation({ timeout }),
        actionFn(),
      ]);
      this.log(`✅ Navigation completed`);
    } catch (e) {
      this.log(`❌ Navigation failed or timed out`, { error: (e as Error).message });
      await this.takeScreenshot('navigation-error');
      throw e;
    }
  }

  async waitForAPI(method: string, urlPattern: string, timeout = 30000) {
    this.log(`📡 Waiting for API: ${method} ${urlPattern} (${timeout}ms)`);
    try {
      const response = await this.page.waitForResponse(
        (resp) =>
          resp.request().method() === method && resp.url().includes(urlPattern),
        { timeout }
      );
      const status = response.status();
      this.log(`✅ API Response: ${method} ${urlPattern} → ${status}`);

      if (status >= 400) {
        const body = await response.text();
        this.log(`⚠️ API returned error status`, { status, body: body.slice(0, 200) });
      }
      return response;
    } catch (e) {
      this.log(`❌ API timeout or not found: ${method} ${urlPattern}`, {
        error: (e as Error).message,
      });
      await this.takeScreenshot(`api-error-${urlPattern.replace(/\//g, '_')}`);
      throw e;
    }
  }

  async checkPageState() {
    const url = this.page.url();
    const title = await this.page.title();
    const readyState = await this.page.evaluate(() => (document as any).readyState);

    this.log(`📍 Page State`, {
      url,
      title,
      readyState,
      timestamp: new Date().toISOString(),
    });
  }

  async getElementCount(selector: string) {
    const count = await this.page.$$eval(selector, (els) => els.length);
    this.log(`📊 Element count for "${selector}": ${count}`);
    return count;
  }

  async logConsoleMessages() {
    this.page.on('console', (msg) => {
      const type = msg.type().toUpperCase();
      this.log(`[CONSOLE ${type}] ${msg.text()}`);
    });
  }

  async expectValue(selector: string, expectedValue: string | RegExp) {
    this.log(`🔍 Checking value for "${selector}"`);
    try {
      await expect(this.page.locator(selector)).toHaveValue(expectedValue);
      this.log(`✅ Value matches: "${expectedValue}"`);
    } catch (e) {
      const actualValue = await this.page.inputValue(selector);
      this.log(`❌ Value mismatch for "${selector}"`, {
        expected: expectedValue,
        actual: actualValue,
      });
      await this.takeScreenshot(`value-mismatch-${selector.slice(0, 20)}`);
      throw e;
    }
  }

  async retryAction(
    action: () => Promise<void>,
    maxRetries = 3,
    delayMs = 2000,
    actionName = 'Action'
  ) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        this.log(`🔄 ${actionName} (attempt ${i + 1}/${maxRetries})`);
        await action();
        this.log(`✅ ${actionName} succeeded on attempt ${i + 1}`);
        return;
      } catch (e) {
        this.log(`❌ ${actionName} failed on attempt ${i + 1}`, { error: (e as Error).message });

        if (i < maxRetries - 1) {
          this.log(`⏳ Retrying in ${delayMs}ms...`);
          await this.page.waitForTimeout(delayMs);
        }
      }
    }
    throw new Error(`${actionName} failed after ${maxRetries} attempts`);
  }

  getSummary() {
    return `Debug logs saved to: ${this.screenshotDir}`;
  }
}
