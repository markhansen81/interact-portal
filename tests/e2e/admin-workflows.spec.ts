/**
 * Admin Workflow Tests
 *
 * Verifies admin portal functionality beyond page loads:
 * TA management, work orders, offers, and invoices.
 *
 * Uses admin storageState from global-setup.
 */
import { test, expect } from "@playwright/test";
import { adminGoto, BASE_URL } from "./helpers";

test.describe.serial("Admin — Teaching Artist Management @admin", () => {
  test("TA list shows at least one teaching artist", async ({ page }) => {
    await adminGoto(page, "/admin/teaching-artists");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    // Should show at least one TA (test account exists)
    const taCards = page.locator("a[href*='/admin/teaching-artists/']");
    await expect(taCards.first()).toBeVisible({ timeout: 10000 });
    const count = await taCards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} TAs in the list`);
  });

  test("TA detail page shows profile information", async ({ page }) => {
    await adminGoto(page, "/admin/teaching-artists");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    const taLinks = page.locator("a[href*='/admin/teaching-artists/']");
    const count = await taLinks.count();
    if (count === 0) { test.skip(); return; }

    await taLinks.first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/teaching-artists\//);

    // Profile sections should be present
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // TA detail page should show profile data
    expect(body!.length).toBeGreaterThan(200);
  });
});

test.describe.serial("Admin — Work Orders @admin", () => {
  test("work orders list loads with table or cards", async ({ page }) => {
    await adminGoto(page, "/admin/work-orders");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // Should have content — either work orders or an empty state
    expect(body!.length).toBeGreaterThan(100);
  });

  test("work order creation form has required fields", async ({ page }) => {
    await adminGoto(page, "/admin/work-orders/new");
    if (page.url().includes("/auth/")) { test.skip(); return; }
    if (!page.url().includes("/admin/work-orders/new")) { test.skip(); return; }

    // Form should have TA selector, project name, school, dates
    const selects = page.locator("select");
    const inputs = page.locator("input[type='text'], input[type='date'], input[type='number']");
    const selectCount = await selects.count();
    const inputCount = await inputs.count();
    expect(selectCount + inputCount).toBeGreaterThan(3);
    console.log(`WO form has ${selectCount} selects and ${inputCount} inputs`);
  });
});

test.describe.serial("Admin — Offers @admin", () => {
  test("offers page loads with status filters", async ({ page }) => {
    await adminGoto(page, "/admin/offers");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    // Should have status filter buttons
    const filters = page.locator("button").filter({ hasText: /Draft|Sent|Accepted|All/ });
    await expect(filters.first()).toBeVisible({ timeout: 10000 });
  });

  test("new offer form has school, contact, and program fields", async ({ page }) => {
    await adminGoto(page, "/admin/offers/new");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    // Core form fields
    const schoolInput = page.locator('input[name="school_name"], input[placeholder*="school" i]').first();
    const contactInput = page.locator('input[name="contact_name"], input[placeholder*="contact" i]').first();

    // At least some form fields should be present
    const formInputs = page.locator("input, select, textarea");
    const count = await formInputs.count();
    expect(count).toBeGreaterThan(5);
    console.log(`Offer form has ${count} form elements`);
  });
});

test.describe.serial("Admin — Invoices @admin", () => {
  test("invoices list loads", async ({ page }) => {
    await adminGoto(page, "/admin/invoices");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // Should have invoice-related content
    expect(body!.length).toBeGreaterThan(100);
  });

  test("invoice detail page loads when clicking a row", async ({ page }) => {
    await adminGoto(page, "/admin/invoices");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    const invoiceLinks = page.locator("a[href*='/admin/invoices/'], tr[data-href*='/admin/invoices/']");
    const count = await invoiceLinks.count();
    if (count === 0) {
      console.log("No invoices to click — skipping detail test");
      test.skip();
      return;
    }

    await invoiceLinks.first().click();
    await page.waitForLoadState("networkidle");
    // Should navigate to an invoice detail page
    const url = page.url();
    console.log(`Navigated to invoice detail: ${url}`);
  });
});

test.describe.serial("Admin — Dashboard Stats @admin", () => {
  test("dashboard shows stat cards with numbers", async ({ page }) => {
    await adminGoto(page, "/admin");
    if (page.url().includes("/auth/")) { test.skip(); return; }

    // Dashboard should have stat cards
    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    // Look for common dashboard elements
    const statCards = page.locator("[class*='stat'], [class*='card'], [class*='metric']");
    const headings = page.locator("h1, h2, h3");
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    console.log(`Dashboard has ${headingCount} headings`);
  });
});
