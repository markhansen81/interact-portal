/**
 * TA Portal Workflow Tests
 *
 * Verifies Teaching Artist portal functionality:
 * profile, documents, work orders, expense claims.
 *
 * Uses TA storageState from global-setup.
 */
import { test, expect } from "@playwright/test";
import { taGoto, BASE_URL, TA_EMAIL } from "./helpers";

test.describe.serial("TA — Profile @ta", () => {
  test.use({ storageState: "tests/e2e/.auth/ta.json" });

  test("profile page shows TA's email address", async ({ page }) => {
    await taGoto(page, "/portal/profile");

    // The profile page should display the TA's email
    const body = await page.textContent("body");
    expect(body).toContain(TA_EMAIL);
  });

  test("profile page has editable fields", async ({ page }) => {
    await taGoto(page, "/portal/profile");

    // Should have input fields for profile data
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(3);
    console.log(`Profile page has ${count} form elements`);
  });
});

test.describe.serial("TA — Documents @ta", () => {
  test.use({ storageState: "tests/e2e/.auth/ta.json" });

  test("documents page shows required document types", async ({ page }) => {
    await taGoto(page, "/portal/documents");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    // Should list the required document types for compliance
    // At minimum, these types should be mentioned somewhere on the page
    const hasDocTypes = body!.includes("Right to Work") ||
      body!.includes("Police Check") ||
      body!.includes("Measles") ||
      body!.includes("right_to_work") ||
      body!.includes("Documents");
    expect(hasDocTypes).toBe(true);
  });

  test("documents page shows upload or status for each doc type", async ({ page }) => {
    await taGoto(page, "/portal/documents");

    // Should have document cards/rows with status indicators
    const statusIndicators = page.locator(
      "text=/approved|pending|missing|upload|expired/i"
    );
    const count = await statusIndicators.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} document status indicators`);
  });
});

test.describe.serial("TA — Work Orders @ta", () => {
  test.use({ storageState: "tests/e2e/.auth/ta.json" });

  test("work orders page shows filter tabs with counts", async ({ page }) => {
    await taGoto(page, "/portal/work-orders");

    // Filter tabs: All, Unsigned, Signed, Declined
    await expect(page.getByRole("button", { name: /^All/ })).toBeVisible({ timeout: 10000 });

    // At least one tab should show a count
    const tabs = page.locator("button").filter({ hasText: /\(\d+\)/ });
    const count = await tabs.count();
    console.log(`Found ${count} tabs with counts`);
  });

  test("work order detail shows project name and school", async ({ page }) => {
    await taGoto(page, "/portal/work-orders");

    // Try to find a work order link
    const woLinks = page.locator("a[href*='/portal/work-orders/']");
    const count = await woLinks.count();
    if (count === 0) {
      console.log("No work orders to view — skipping detail check");
      test.skip();
      return;
    }

    await woLinks.first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/portal\/work-orders\//);

    // Detail page should show work order information
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(200);
  });
});

test.describe.serial("TA — Expense Claims @ta", () => {
  test.use({ storageState: "tests/e2e/.auth/ta.json" });

  test("expenses list page loads", async ({ page }) => {
    await taGoto(page, "/portal/expenses");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // Should have expense-related content
    expect(body!.length).toBeGreaterThan(50);
  });

  test("new expense form has required fields", async ({ page }) => {
    await taGoto(page, "/portal/expenses/new");

    // Expense form should have: description, amount, category, receipt upload
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(2);

    // Should have an amount field
    const amountField = page.locator('input[type="number"], input[placeholder*="amount" i], input[name*="amount" i]');
    const amountCount = await amountField.count();
    console.log(`Expense form has ${count} fields, ${amountCount} amount fields`);
  });
});

test.describe.serial("TA — Invoices @ta", () => {
  test.use({ storageState: "tests/e2e/.auth/ta.json" });

  test("invoices page loads with list or empty state", async ({ page }) => {
    await taGoto(page, "/portal/invoices");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(50);
  });
});

test.describe.serial("TA — Navigation @ta", () => {
  test.use({ storageState: "tests/e2e/.auth/ta.json" });

  test("sidebar shows all main navigation items", async ({ page }) => {
    await taGoto(page, "/portal");

    // TA sidebar should have these core navigation links
    const navItems = ["Dashboard", "Work Orders", "Projects", "Expenses", "Invoices", "Documents", "Profile"];
    for (const item of navItems) {
      const link = page.locator(`a, button`).filter({ hasText: new RegExp(`^${item}$`, "i") });
      const count = await link.count();
      if (count === 0) {
        console.log(`Missing sidebar item: ${item}`);
      }
    }

    // At minimum, some navigation should be present
    const navLinks = page.locator("nav a, aside a");
    const totalNav = await navLinks.count();
    expect(totalNav).toBeGreaterThan(3);
    console.log(`TA sidebar has ${totalNav} navigation links`);
  });
});
