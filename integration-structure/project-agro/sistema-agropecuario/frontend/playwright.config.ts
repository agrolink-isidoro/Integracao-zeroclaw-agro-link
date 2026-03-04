import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 1,
  use: {
    headless: true,
    // allow overriding baseURL via env var (useful for local runs on different ports)
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  // Reporters: list output + junit XML and HTML report for CI artifacts
  // Use environment variables to allow CI to override the output directories and avoid permission issues locally
  // Use /tmp/playwright as a safe fallback on environments with restrictive repo permissions
  reporter: [
    ["list"],
    ["junit", { outputFile: process.env.PLAYWRIGHT_JUNIT || "/tmp/playwright/junit.xml" }],
    ["html", { outputFolder: process.env.PLAYWRIGHT_HTML || "/tmp/playwright/html", open: "never" }]
  ],
  // Ensure Playwright writes temporary results to a writable dir to avoid permission errors in sandboxed environments
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || '/tmp/playwright/results',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
