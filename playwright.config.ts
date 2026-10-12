import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for QuizApp E2E tests.
 *
 * Runs against the Vite dev server with mock data enabled.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    // Pin the locale: i18n detection (querystring → localStorage → navigator)
    // must resolve to English deterministically, regardless of the host OS.
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_USE_MOCK_DATA: 'true',
    },
  },
})
