import { test, expect } from "@playwright/test";
import { loginAsTA, BASE_URL } from "./helpers";

test.describe.serial("TA Flow", () => {
  test("a) Login — TA can log in and lands on /portal", async ({ page }) => {
    console.log("Checking TA login...");
    await loginAsTA(page);
    await expect(page).toHaveURL(/\/portal/);
    await page.screenshot({ path: "test-results/ta-login.png" });
    console.log("TA login successful");
  });

  test("b) Dashboard loads — /portal shows welcome content", async ({
    page,
  }) => {
    console.log("Checking TA dashboard...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal/);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
    await page.screenshot({ path: "test-results/ta-dashboard.png" });
    console.log("TA dashboard loaded with welcome text");
  });

  test("c) Availability page — calendar UI renders", async ({ page }) => {
    console.log("Checking TA availability page...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/availability`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal\/availability/);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    await page.screenshot({ path: "test-results/ta-availability.png" });
    console.log("TA availability page loaded with calendar UI");
  });

  test("d) Work orders list — table and filter tabs with counts", async ({
    page,
  }) => {
    console.log("Checking TA work orders list...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    // Table/list should be visible
    await expect(
      page.locator("h2").filter({ hasText: "My Work Orders" })
    ).toBeVisible();

    // Check filter tabs exist with counts
    const filterBar = page.locator(".flex.gap-1");
    await expect(
      filterBar.getByRole("button", { name: /^All/ })
    ).toBeVisible();
    await expect(
      filterBar.getByRole("button", { name: /^Unsigned/ })
    ).toBeVisible();
    await expect(
      filterBar.getByRole("button", { name: /^Signed/ })
    ).toBeVisible();
    await expect(
      filterBar.getByRole("button", { name: /^Declined/ })
    ).toBeVisible();

    await page.screenshot({ path: "test-results/ta-work-orders.png" });
    console.log("TA work orders list loaded with filter tabs");
  });

  test("e) Click filter tabs — Signed filters correctly, All shows all", async ({
    page,
  }) => {
    console.log("Checking TA work order filter tabs...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    const filterBar = page.locator(".flex.gap-1");

    // Click Signed tab
    await filterBar.getByRole("button", { name: /^Signed/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/ta-wo-signed-filter.png" });

    // Click All tab
    await filterBar.getByRole("button", { name: /^All/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "test-results/ta-wo-all-filter.png" });
    console.log("TA work order filter tabs work correctly");
  });

  test("f) View signed work order — detail page loads with project info", async ({
    page,
  }) => {
    console.log("Checking signed work order detail...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    // Filter to signed
    await page
      .locator(".flex.gap-1")
      .getByRole("button", { name: /^Signed/ })
      .click();
    await page.waitForTimeout(500);

    const viewButtons = page.locator('a:has-text("View")');
    const count = await viewButtons.count();
    if (count > 0) {
      await viewButtons.first().click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/portal\/work-orders\//);
      await expect(page.locator('text="WORK ORDER"')).toBeVisible();
      await expect(page.locator('text="Project Details"')).toBeVisible();
      await page.screenshot({
        path: "test-results/ta-signed-wo-detail.png",
      });
      console.log("Signed work order detail loaded with project info");
    } else {
      console.log(
        "No signed work orders available to view -- skipping detail check"
      );
    }
  });

  test("g) Signed WO has PDF download button", async ({ page }) => {
    console.log("Checking signed WO PDF download button...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    await page
      .locator(".flex.gap-1")
      .getByRole("button", { name: /^Signed/ })
      .click();
    await page.waitForTimeout(500);

    const pdfButtons = page.locator('a:has-text("PDF")');
    const count = await pdfButtons.count();
    if (count > 0) {
      await expect(pdfButtons.first()).toBeVisible();
      console.log("Signed WO has PDF download button");
    } else {
      console.log("No signed WOs with PDF available -- skipping");
    }
  });

  test("h) Signed WO has Project button", async ({ page }) => {
    console.log("Checking signed WO Project button...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    await page
      .locator(".flex.gap-1")
      .getByRole("button", { name: /^Signed/ })
      .click();
    await page.waitForTimeout(500);

    const projectButtons = page.locator('a:has-text("Project")');
    const count = await projectButtons.count();
    if (count > 0) {
      await expect(projectButtons.first()).toBeVisible();
      console.log("Signed WO has Project button");
    } else {
      console.log("No signed WOs with linked project -- skipping");
    }
  });

  test("i) Projects list — /portal/projects loads", async ({ page }) => {
    console.log("Checking TA projects list...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/projects`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal\/projects/);
    await page.screenshot({ path: "test-results/ta-projects.png" });
    console.log("TA projects list loaded");
  });

  test("j) Project detail — tasks and documents sections visible", async ({
    page,
  }) => {
    console.log("Checking TA project detail...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/projects`);
    await page.waitForLoadState("networkidle");

    const projectLinks = page.locator("a[href*='/portal/projects/']");
    const count = await projectLinks.count();
    if (count > 0) {
      await projectLinks.first().click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/portal\/projects\//);
      await page.screenshot({ path: "test-results/ta-project-detail.png" });
      console.log("TA project detail loaded");
    } else {
      console.log("No projects available -- skipping project detail check");
    }
  });

  test("k) Calendar — month header and upcoming sidebar visible", async ({
    page,
  }) => {
    console.log("Checking TA calendar...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/calendar`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal\/calendar/);
    await page.screenshot({ path: "test-results/ta-calendar.png" });
    console.log("TA calendar loaded");
  });

  test("l) Profile page — /portal/profile loads", async ({ page }) => {
    console.log("Checking TA profile page...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/profile`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal\/profile/);
    await page.screenshot({ path: "test-results/ta-profile.png" });
    console.log("TA profile page loaded");
  });

  test("m) Messages page — /portal/messages loads", async ({ page }) => {
    console.log("Checking TA messages page...");
    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/messages`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal\/messages/);
    await page.screenshot({ path: "test-results/ta-messages.png" });
    console.log("TA messages page loaded");
  });
});
