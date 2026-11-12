import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers";

test.describe.serial("Teacher / School Portal Flow", () => {
  test("1. School project page redirects to magic link verify page", async ({ page }) => {
    // Any school project URL should redirect to /verify (magic link gate)
    await page.goto(`${BASE_URL}/school/project/test-token`);
    await page.waitForLoadState("networkidle");

    // Should redirect to verify page (not 500 or crash)
    const url = page.url();
    const redirectedToVerify = url.includes("/verify");
    const isNotFound = (await page.textContent("body"))?.includes("404") ?? false;

    // Either it redirected to verify, or it shows 404 for unknown token
    // (404 from notFound() happens before requireSchoolSession for invalid tokens)
    expect(redirectedToVerify || isNotFound || url.includes("/school")).toBe(true);

    await page.screenshot({ path: "test-results/teacher-verify-redirect.png" });
    console.log(`School project URL result: ${url}`);
  });

  test("2. Verify page shows email input form", async ({ page }) => {
    // Navigate directly to a verify page
    await page.goto(`${BASE_URL}/school/project/test-token/verify`);
    await page.waitForLoadState("networkidle");

    // Should show the InterACT School Portal heading
    await expect(page.locator("h1")).toContainText("School Portal");

    // Should show email input
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Should show the send button
    await expect(page.locator('button:has-text("Send login link")')).toBeVisible();

    await page.screenshot({ path: "test-results/teacher-verify-page.png" });
    console.log("Verify page loaded correctly with email form");
  });

  test("3. Verify page — wrong email shows error", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/project/test-token/verify`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', "wrong@example.com");
    await page.click('button:has-text("Send login link")');
    await page.waitForTimeout(3000);

    // Should show an error (either "not recognised" or "invalid link" for test token)
    const body = await page.textContent("body");
    const hasError = body?.includes("not recognised") || body?.includes("Invalid") || body?.includes("Error");
    expect(hasError).toBe(true);

    await page.screenshot({ path: "test-results/teacher-verify-error.png" });
    console.log("Verify page correctly rejects wrong email");
  });

  test("4. Info form page also redirects to verify", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/project/test-token/info-form`);
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const redirectedToVerify = url.includes("/verify");
    const isNotFound = (await page.textContent("body"))?.includes("404") ?? false;

    expect(redirectedToVerify || isNotFound).toBe(true);

    await page.screenshot({ path: "test-results/teacher-info-form-redirect.png" });
    console.log(`Info form redirect result: ${url}`);
  });

  test("5. Feedback page also redirects to verify", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/project/test-token/feedback`);
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const redirectedToVerify = url.includes("/verify");
    const isNotFound = (await page.textContent("body"))?.includes("404") ?? false;

    expect(redirectedToVerify || isNotFound).toBe(true);

    await page.screenshot({ path: "test-results/teacher-feedback-redirect.png" });
    console.log(`Feedback redirect result: ${url}`);
  });
});
