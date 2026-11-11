import { defineConfig } from '@playwright/test';

/**
 * Browser tests (end to end).
 *
 *   1. Start the API against the LOCAL dev database (never production), e.g.
 *        ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5299 Platform__AdminKey=e2e-platform-key dotnet ReactPosApi.dll
 *   2. npx playwright test
 *
 * The run creates its own throwaway tenant with dummy data (see e2e/global-setup.ts).
 * It uses the installed Microsoft Edge, so no browser download is needed.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:5299';
const PORT = Number(process.env.E2E_WEB_PORT ?? 5173);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Tests share one tenant and change its stock, so they run one after another.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  outputDir: 'e2e-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 900 },
    storageState: 'e2e/.auth/state.json',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_BACKEND_URL: API },
  },
});
