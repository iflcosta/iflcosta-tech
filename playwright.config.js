// Smoke tests mobile-first. Para rodar em desktop ou em mais browsers,
// descomente os projects no fim do arquivo.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 }, // iPhone 12-ish, mobile-first
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },

    // -------------------------------------------------------------------
    // Para ativar outros browsers/viewports, descomente o que precisar:
    // -------------------------------------------------------------------
    // {
    //   name: 'firefox',
    //   use: { ...devices['Pixel 5'] }, // mobile firefox
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['iPhone 12'] },
    // },
    // {
    //   name: 'chromium-desktop',
    //   use: { ...devices['Desktop Chrome'] },
    // },
    // {
    //   name: 'firefox-desktop',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit-desktop',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  webServer: {
    command: 'npm run serve',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
