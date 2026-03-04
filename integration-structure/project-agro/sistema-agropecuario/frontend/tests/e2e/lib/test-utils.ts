import { Page, Locator } from '@playwright/test';

export async function waitForSelectOptions(page: Page, selector: string, opts: { timeout?: number } = {}) {
  const timeout = opts.timeout ?? 15000;
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLSelectElement | null;
      if (!el) return false;
      const opts = Array.from(el.querySelectorAll('option'));
      return opts.length > 1 && opts.some(o => o.value && o.value.trim() !== '');
    },
    selector,
    { timeout }
  );
}

export async function waitForModalTitle(modal: Locator, re: RegExp | string, timeout = 15000) {
  // use locator's waitFor with text check
  await modal.waitFor({ state: 'visible', timeout });
  const title = modal.locator('h5.modal-title');
  await title.waitFor({ state: 'visible', timeout });
  // optionally assert text - do not throw silently if doesn't match in time
  const txt = typeof re === 'string' ? re : re.source;
  await pageWaitForText(title, re, timeout);
}

async function pageWaitForText(locator: Locator, re: RegExp | string, timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const txt = (await locator.textContent()) || '';
      const ok = typeof re === 'string' ? txt.includes(re) : re.test(txt);
      if (ok) return;
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for modal title to match ${re}`);
}
