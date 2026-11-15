import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL, viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION ? "pnpm start" : "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PRODUCTION,
    timeout: 120_000,
  },
});
