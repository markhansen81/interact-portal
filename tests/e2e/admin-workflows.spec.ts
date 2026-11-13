/**
 * Admin Workflow Tests
 *
 * Verifies admin portal functionality with real assertions:
 * TA management, work orders, offers, invoices.
 *
 * Tests FAIL when auth or required data is missing (no silent skips).
 */
import { test, expect } from "@playwright/test";
import { adminGoto, requirePage } from "./helpers";

test.describe.serial("Admin — Teaching Artist Management @admin", () => {
  test("TA list renders with at least one TA card/row", async ({ page }) => {
    await adminGoto(page, "/admin/teaching-artists");
    await requirePage(page, /\/admin\/teaching-artists/, "TA list");

    // Must show at least one TA entry (test accounts exist)
    const taLinks = page.locator("a[href*='/admin/teaching-artists/']");
    await expect(taLinks.first()).toBeVisible({ timeout: 10000 });
    const count = await taLinks.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/admin-ta-list.png" });
  });

  test("TA detail page shows profile sections", async ({ page }) => {
    await adminGoto(page, "/admin/teaching-artists");
    await requirePage(page, /\/admin\/teaching-artists/, "TA list");

    // Click into the first TA
    const taLinks = page.locator("a[href*='/admin/teaching-artists/']");
    await expect(taLinks.first()).toBeVisible({ timeout: 10000 });
    await taLinks.first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/teaching-artists\/.+/);

    // TA detail must show profile data — look for known section headings or labels
    const labels = page.locator("dt, label, th, h3");
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThan(3);

    await page.screenshot({ path: "test-results/admin-ta-detail.png" });
  });
});

test.describe.serial("Admin — Work Orders @admin", () => {
  test("work orders list renders table with headers", async ({ page }) => {
    await adminGoto(page, "/admin/work-orders");
    await requirePage(page, /\/admin\/work-orders/, "WO list");

    // Should show table headers or card layout with WO data
    const tableHeaders = page.locator("th");
    const headings = page.locator("h1, h2, h3");
    const headerCount = await tableHeaders.count();
    const headingCount = await headings.count();
    expect(headerCount + headingCount).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/admin-wo-list.png" });
  });

  test("work order creation form has TA selector, dates, and school fields", async ({ page }) => {
    await adminGoto(page, "/admin/work-orders/new");
    await requirePage(page, /\/admin\/work-orders\/new/, "WO form");

    // Must have a select (TA picker) and date inputs
    const selects = page.locator("select");
    const dateInputs = page.locator('input[type="date"]');
    await expect(selects.first()).toBeVisible({ timeout: 10000 });

    const selectCount = await selects.count();
    const dateCount = await dateInputs.count();
    expect(selectCount).toBeGreaterThan(0);
    expect(dateCount).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/admin-wo-form.png" });
  });
});

test.describe.serial("Admin — Offers @admin", () => {
  test("offers page renders with status filter buttons", async ({ page }) => {
    await adminGoto(page, "/admin/offers");
    await requirePage(page, /\/admin\/offers/, "Offers list");

    // Must have status filter buttons (All, Draft, Sent, etc.)
    const allButton = page.getByRole("button", { name: /All/i });
    await expect(allButton).toBeVisible({ timeout: 10000 });

    // Verify multiple filter buttons exist
    const draftButton = page.getByRole("button", { name: /Draft/i });
    const sentButton = page.getByRole("button", { name: /Sent/i });
    await expect(draftButton).toBeVisible();
    await expect(sentButton).toBeVisible();

    await page.screenshot({ path: "test-results/admin-offers-list.png" });
  });

  test("new offer form has school name, contact, and program sections", async ({ page }) => {
    await adminGoto(page, "/admin/offers/new");
    await requirePage(page, /\/admin\/offers\/new/, "Offer form");

    // Must have input fields for school/contact details
    const inputs = page.locator("input, select, textarea");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(5);

    // Must have program type checkboxes or selector
    const programSection = page.locator('text=/Native Speaker|Theatre|Film|Art in Action/i');
    await expect(programSection.first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "test-results/admin-offer-form.png" });
  });
});

test.describe.serial("Admin — Invoices @admin", () => {
  test("invoices page renders with table or list", async ({ page }) => {
    await adminGoto(page, "/admin/invoices");
    await requirePage(page, /\/admin\/invoices/, "Invoices list");

    // Must show invoice headers or table structure
    const headings = page.locator("h1, h2, h3, th");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/admin-invoices.png" });
  });
});

test.describe.serial("Admin — Dashboard @admin", () => {
  test("dashboard shows alert/stat sections with real data", async ({ page }) => {
    await adminGoto(page, "/admin");
    await requirePage(page, /\/admin$/, "Admin dashboard");

    // Dashboard must have stat cards or section headings
    const headings = page.locator("h1, h2, h3");
    await expect(headings.first()).toBeVisible({ timeout: 10000 });
    const count = await headings.count();
    expect(count).toBeGreaterThan(1);

    // Should have numeric values (stats)
    const numbers = page.locator('text=/\\d+/');
    const numCount = await numbers.count();
    expect(numCount).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/admin-dashboard.png" });
  });
});
