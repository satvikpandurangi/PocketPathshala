import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8090',
    browserName: 'chromium',
    channel: 'chrome',
    serviceWorkers: 'allow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec tsx tools/demo/e2e-server.ts',
    url: 'http://localhost:8090/api/health',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
