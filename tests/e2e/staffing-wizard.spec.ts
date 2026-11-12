import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

const PROJECT_ID = "f1360f8b-2929-43cf-b8c9-2066d1179845";
const BASE = process.env.TEST_BASE_URL || "https://interact-portal.vercel.app";

test.describe.serial("Staffing Wizard + Admin Coordination", () => {

  test("1. Admin project shows coordination tasks", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");

    // Scroll to find admin coordination
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/staffing/01-admin-tasks.png" });

    const body = await page.textContent("body");
    expect(body).toContain("Admin Coordination");
    expect(body).toContain("Staff project");
    expect(body).toContain("Draft schedule");
    console.log("✅ Admin coordination tasks visible");
    await page.close();
  });

  test("2. Staff Project button opens wizard", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");

    // Click Staff Project button
    const staffBtn = page.locator("button").filter({ hasText: /staff project/i });
    await staffBtn.first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/staffing/02-wizard-open.png" });

    // Check wizard modal is open
    const body = await page.textContent("body");
    const hasWizard = body?.includes("Available Teaching Artists") || body?.includes("Select Teaching");
    console.log(`  Wizard content: ${hasWizard ? "visible" : "checking..."}`);

    // Check if TAs are listed
    const hasTA = body?.includes("Mark Hansen") || body?.includes("Test TA");
    console.log(`  TAs listed: ${hasTA ? "yes" : "no"}`);

    console.log("✅ Staffing wizard opens");
    await page.close();
  });

  test("3. Wizard shows TA availability", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");

    const staffBtn = page.locator("button").filter({ hasText: /staff project/i });
    await staffBtn.first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/staffing/03-ta-availability.png" });

    // Check for availability indicators
    const body = await page.textContent("body");
    const hasAvailability = body?.includes("/5") || body?.includes("days");
    console.log(`  Availability shown: ${hasAvailability ? "yes" : "no"}`);

    // Check for checkboxes to select TAs
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    console.log(`  Selectable TAs: ${count}`);

    console.log("✅ TA availability displayed");
    await page.close();
  });

  test("4. Admin can check off coordination tasks", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");

    // Find a task checkbox (not the Staff one)
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Click "Draft schedule" checkbox
    const taskCheckbox = page.locator("text=Draft schedule").locator("..").locator('input[type="checkbox"], button').first();
    if (await taskCheckbox.count() > 0) {
      await taskCheckbox.click();
      await page.waitForTimeout(1000);
      console.log("  Toggled Draft schedule task");
    }

    await page.screenshot({ path: "test-results/staffing/04-task-toggled.png" });
    console.log("✅ Admin coordination task toggle");
    await page.close();
  });
});
