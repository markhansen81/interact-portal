import { type Page, expect } from "@playwright/test";

// ── All credentials come from environment variables ──────────────────────────
// Set these in .env.test (local) or GitHub Actions secrets (CI).
// NEVER hardcode credentials in source code.

export const BASE_URL =
  process.env.TEST_BASE_URL || "https://interact-portal.vercel.app";

export const ADMIN_EMAIL = requireEnv("E2E_ADMIN_EMAIL");
export const ADMIN_PASS = requireEnv("E2E_ADMIN_PASS");
export const TA_A_EMAIL = requireEnv("E2E_TA_A_EMAIL");
export const TA_A_PASS = requireEnv("E2E_TA_A_PASS");
export const TA_B_EMAIL = requireEnv("E2E_TA_B_EMAIL");
export const TA_B_PASS = requireEnv("E2E_TA_B_PASS");
export const SCHOOL_PROJECT_TOKEN = requireEnv("E2E_SCHOOL_PROJECT_TOKEN");

// Legacy aliases for existing tests that reference TA_EMAIL/TA_PASS
export const TA_EMAIL = TA_A_EMAIL;
export const TA_PASS = TA_A_PASS;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in .env.test (local) or GitHub Actions secrets (CI).`
    );
  }
  return value;
}

// ── Authentication helpers ───────────────────────────────────────────────────

export async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/admin") && !page.url().includes("/auth/")) {
    return; // Already authenticated
  }

  await page.goto(`${BASE_URL}/auth/admin`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('#email, input[type="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(ADMIN_EMAIL);
  await page.locator('#password, input[type="password"]').first().fill(ADMIN_PASS);
  await page.click('button[type="submit"], button:has-text("Sign in")');

  await page.waitForURL(
    (url) =>
      url.pathname === "/admin" ||
      (url.pathname.startsWith("/admin/") && !url.pathname.startsWith("/auth/")),
    { timeout: 30000 }
  );
  await page.waitForLoadState("networkidle");
}

export async function loginAsTA(page: Page, email = TA_A_EMAIL, pass = TA_A_PASS) {
  const currentUrl = page.url();
  if (currentUrl.includes("/portal") && !currentUrl.includes("/auth/")) {
    return; // Already authenticated
  }

  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/portal")) {
    return; // Session already valid
  }

  const emailInput = page.locator('input[type="email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 30000 });
    await page.waitForLoadState("networkidle");
  }
}

// ── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Navigate to an admin page. Uses storageState if available,
 * otherwise logs in. Retries up to 3 times on transient errors.
 */
export async function adminGoto(page: Page, path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/auth/")) {
      try {
        await loginAsAdmin(page);
      } catch {
        console.log("loginAsAdmin failed — returning current URL to caller");
        return;
      }
      continue;
    }

    if ((await page.locator("text=/couldn.t load/").count()) > 0) {
      await page.waitForTimeout(3000);
      continue;
    }

    return;
  }
}

/**
 * Navigate to a TA portal page. Uses storageState if available.
 */
export async function taGoto(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/auth/")) {
    await loginAsTA(page);
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle");
  }
}

/**
 * Verify the current page is authenticated and on the expected path.
 * Fails the test (not skips) if auth or navigation failed.
 */
export async function requirePage(page: Page, pathPattern: RegExp, label: string) {
  const url = page.url();
  if (url.includes("/auth/")) {
    throw new Error(`${label}: authentication failed — redirected to ${url}`);
  }
  await expect(page).toHaveURL(pathPattern);
}
