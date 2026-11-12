import { test as setup } from "@playwright/test";
import { BASE_URL, TA_EMAIL, TA_PASS } from "./helpers";
import path from "path";

const TA_AUTH = path.join(__dirname, ".auth/ta.json");

setup("authenticate as TA", async ({ page }) => {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', TA_EMAIL);
  await page.fill('input[type="password"]', TA_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/portal**", { timeout: 30000 });
  await page.waitForLoadState("networkidle");

  // Save signed-in state
  await page.context().storageState({ path: TA_AUTH });
});
