import { defineConfig, devices } from '@playwright/test';

/** Smoke e2e sobre preview.html (datos de ejemplo) con Supabase simulado vía page.route. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5198',
    locale: 'es-MX',
    timezoneId: 'America/Monterrey',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
    { name: 'ipad', use: { viewport: { width: 1180, height: 820 }, browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx vite --port 5198 --strictPort',
    url: 'http://localhost:5198/preview.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
