import { test as setup } from "@playwright/test";
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASS } from "./helpers";
import path from "path";

const ADMIN_AUTH = path.join(__dirname, ".auth/admin.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto(`${BASE_URL}/auth/admin`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], #email', ADMIN_EMAIL);
  await page.fill('input[type="password"], #password', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin**", { timeout: 30000 });
  await page.waitForLoadState("networkidle");

  // Save signed-in state
  await page.context().storageState({ path: ADMIN_AUTH });
});
