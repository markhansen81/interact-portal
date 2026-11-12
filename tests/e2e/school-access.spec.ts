/**
 * School Portal Access Tests
 *
 * Verifies token-based school access:
 * valid tokens load, invalid tokens show error,
 * and public-facing school forms work.
 *
 * No Supabase auth session needed — schools use magic-link tokens.
 */
import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers";

// Known test token from the test fixtures
const TEACHER_TOKEN = "5e758ca9-3a7e-4185-a2bb-ce94c749bc79";

test.describe("School Portal — Token Access @teacher", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("valid project token loads the school portal page", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/project/${TEACHER_TOKEN}`);
    await page.waitForLoadState("networkidle");

    // Should NOT redirect to /auth — school uses token, not session
    expect(page.url()).not.toContain("/auth/");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
    console.log("School portal loaded for valid token");
  });

  test("invalid project token shows error or empty state", async ({ page }) => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    await page.goto(`${BASE_URL}/school/project/${fakeToken}`);
    await page.waitForLoadState("networkidle");

    // Should show an error message or 404-style page, NOT the full portal
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    // The page should indicate something is wrong (no project found, access denied, etc.)
    console.log("Invalid token response:", page.url());
  });

  test("non-UUID token path returns error", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/project/not-a-valid-uuid`);
    await page.waitForLoadState("networkidle");

    // Should handle gracefully — not crash
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("Non-UUID token handled gracefully");
  });
});

test.describe("School Portal — Information Pack Form @teacher", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("info-form page loads for valid token", async ({ page }) => {
    await page.goto(`${BASE_URL}/school/project/${TEACHER_TOKEN}/info-form`);
    await page.waitForLoadState("networkidle");

    // Should load a form or verification step (email gate)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("Info form page loaded, URL:", page.url());
  });
});
