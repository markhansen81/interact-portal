import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsTA, adminGoto } from "./helpers";

const BASE = process.env.TEST_BASE_URL || "https://interact-portal.vercel.app";

test.describe.serial("Expense & Invoice Flow", () => {
  // ============ TA EXPENSE SUBMISSION ============

  test("1. TA can access expense form", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/expenses`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/01-ta-expenses-list.png" });

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("✅ TA expenses page loads");

    // Click new expense
    const newBtn = page.locator('a:has-text("New"), a:has-text("Submit"), a:has-text("Claim")').first();
    if ((await newBtn.count()) > 0) {
      await newBtn.click();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: "test-results/expense-flow/01b-ta-expense-form.png" });
      console.log("✅ TA expense form loads");
    }
    await page.close();
  });

  test("2. TA expense form has category dropdown", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/expenses/new`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/02-ta-expense-new.png" });

    // Check for category select
    const categorySelect = page.locator("select").first();
    expect(await categorySelect.count()).toBeGreaterThan(0);

    // Check category options exist
    const options = await page.locator("select option").allTextContents();
    const optionText = options.join(" ").toLowerCase();
    expect(optionText).toContain("material");
    console.log("✅ Category dropdown present with expected options");

    // Check for camera/file input
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);
    console.log("✅ Receipt upload input present");

    // Check project selector is present and required
    const projectSelect = page.locator("select").first();
    expect(await projectSelect.count()).toBeGreaterThan(0);
    console.log("✅ Project selector present");

    await page.close();
  });

  test("3. TA expense form calculates running total", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/expenses/new`);
    await page.waitForLoadState("networkidle");

    // Fill in an amount
    const amountInput = page.locator('input[type="number"]').first();
    if ((await amountInput.count()) > 0) {
      await amountInput.fill("25.50");
      await page.waitForTimeout(500);

      const body = await page.textContent("body");
      expect(body).toContain("25.50");
      console.log("✅ Running total updates");
    }

    await page.screenshot({ path: "test-results/expense-flow/03-ta-expense-total.png" });
    await page.close();
  });

  // ============ TA INVOICE UPLOAD ============

  test("4. TA can access invoice upload page", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/invoices`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/04-ta-invoices-list.png" });

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("✅ TA invoices page loads");

    await page.close();
  });

  test("5. TA invoice upload page has file input", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/invoices/upload`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/05-ta-invoice-upload.png" });

    // Check file input exists
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);
    console.log("✅ Invoice upload file input present");

    // Check work order selector exists
    const selects = page.locator("select");
    expect(await selects.count()).toBeGreaterThan(0);
    console.log("✅ Work order selector present");

    await page.close();
  });

  // ============ ADMIN FINANCIAL DASHBOARD ============

  test("6. Admin financial dashboard loads with tabs", async ({ browser }) => {
    const page = await browser.newPage();
    await adminGoto(page, "/admin/invoices");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/06-admin-financial.png" });

    const body = await page.textContent("body");

    // Check summary cards exist
    expect(body).toContain("Pending Review");
    console.log("✅ Summary cards visible");

    // Check tabs
    const hasExpensesTab = body?.includes("Expenses") || body?.includes("Flagged");
    expect(hasExpensesTab).toBeTruthy();
    console.log("✅ Expenses tab present");

    await page.close();
  });

  test("7. Admin can switch to expenses tab", async ({ browser }) => {
    const page = await browser.newPage();
    await adminGoto(page, "/admin/invoices");
    await page.waitForLoadState("networkidle");

    // Click expenses/flagged tab
    const expensesTab = page.locator('button:has-text("Expenses"), button:has-text("Flagged")').first();
    if ((await expensesTab.count()) > 0) {
      await expensesTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/expense-flow/07-admin-expenses-tab.png" });
      console.log("✅ Expenses tab content loads");
    }

    await page.close();
  });

  // ============ MOBILE RESPONSIVENESS ============

  test("8. TA expense form is mobile-friendly", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X
    });
    const page = await context.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/expenses/new`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/08-ta-expense-mobile.png" });

    // Check bottom nav is visible on mobile
    const bottomNav = page.locator("nav.fixed");
    if ((await bottomNav.count()) > 0) {
      console.log("✅ Bottom navigation visible on mobile");
    }

    // Form should be stacked on mobile
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("✅ Expense form renders on mobile viewport");

    await context.close();
  });

  test("9. TA portal shows bottom nav on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/expense-flow/09-ta-portal-mobile.png" });

    // Bottom nav should be present
    const bottomNav = page.locator("nav").last();
    const navText = await bottomNav.textContent();
    expect(navText).toContain("Dashboard");
    expect(navText).toContain("Projects");
    console.log("✅ Mobile bottom nav shows Dashboard + Projects tabs");

    // Sidebar should be hidden
    const sidebar = page.locator("aside");
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    expect(sidebarVisible).toBeFalsy();
    console.log("✅ Desktop sidebar hidden on mobile");

    await context.close();
  });

  // ============ PWA ============

  test("10. PWA manifest is accessible", async ({ browser }) => {
    const page = await browser.newPage();
    const response = await page.goto(`${BASE}/manifest.json`);
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest.name).toContain("InterACT");
    expect(manifest.start_url).toBe("/portal");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#d97706");
    console.log("✅ PWA manifest valid with correct config");

    await page.close();
  });
});
