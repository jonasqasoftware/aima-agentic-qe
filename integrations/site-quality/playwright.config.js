import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8123',
    screenshot: 'only-on-failure',
    trace: 'off'
  },
  webServer: {
    command: 'python3 -m http.server 8123 --directory ../../dist/site',
    url: 'http://127.0.0.1:8123/index.html',
    reuseExistingServer: false,
    timeout: 30_000
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } }
    }
  ]
});
