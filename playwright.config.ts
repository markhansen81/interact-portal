import { defineConfig, devices } from "@playwright/test";

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_KEY;
const USE_BROWSERLESS = !!BROWSERLESS_TOKEN;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  retries: 1,
  workers: 1, // serial to avoid auth conflicts
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL:
      process.env.TEST_BASE_URL || "https://interact-portal.vercel.app",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...(USE_BROWSERLESS && {
      connectOptions: {
        wsEndpoint: `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`,
      },
    }),
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    {
      name: "ta-mobile",
      use: {
        ...devices["iPhone 14"],
        storageState: "tests/e2e/.auth/ta.json",
      },
      testMatch: /ta-workflows\.spec\.ts|expense-invoice-flow\.spec\.ts/,
    },
  ],
});
