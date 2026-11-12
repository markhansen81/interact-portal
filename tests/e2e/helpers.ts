import { type Page, expect } from "@playwright/test";

export const BASE_URL =
  process.env.TEST_BASE_URL || "https://interact-portal.vercel.app";

export const ADMIN_EMAIL = "test-admin@interactenglish.de";
export const ADMIN_PASS = "TestAdmin2026!";
export const TA_EMAIL = "markwilliamhansen@gmail.com";
export const TA_PASS = "InterACT2026!";
export const TA_ID = "58653b23-6775-45ea-9aa4-447a3fd1f6d9";

export async function loginAsAdmin(page: Page) {
  // Try going to /admin directly — if session is valid, we land there
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle");

  // Already authed — on admin dashboard (not auth page)
  if (page.url().includes("/admin") && !page.url().includes("/auth/")) {
    return;
  }

  // Need to log in
  await page.goto(`${BASE_URL}/auth/admin`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('#email, input[type="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(ADMIN_EMAIL);
  await page.locator('#password, input[type="password"]').first().fill(ADMIN_PASS);
  await page.click('button[type="submit"], button:has-text("Sign in")');

  // Wait for redirect to /admin (NOT /auth/admin — that's the login page itself)
  await page.waitForURL(
    (url) => url.pathname === "/admin" || (url.pathname.startsWith("/admin/") && !url.pathname.startsWith("/admin/auth")),
    { timeout: 30000 }
  );
  await page.waitForLoadState("networkidle");
}

export async function loginAsTA(page: Page) {
  const currentUrl = page.url();
  if (currentUrl.includes("/portal") && !currentUrl.includes("/auth/")) {
    return;
  }

  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/portal")) {
    return;
  }

  const emailInput = page.locator('input[type="email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(TA_EMAIL);
    await page.fill('input[type="password"]', TA_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 30000 });
    await page.waitForLoadState("networkidle");
  }
}

/** Sidebar link mapping: path -> sidebar label text */
const SIDEBAR_LABELS: Record<string, string> = {
  "/admin/work-orders": "Work Orders",
  "/admin/projects": "TA Assignments",
  "/admin/teaching-artists": "Teaching Artists",
  "/admin/contracts": "Contracts",
  "/admin/invoices": "Invoices",
  "/admin/availability": "Availability",
  "/admin/messages": "Messages",
  "/admin/insurance-orders": "Insurance",
  "/admin/offers": "Offers",
  "/admin/church": "CRM Pipeline",
  "/admin/services": "Services & Rates",
  "/admin/onboarding": "Onboarding",
  "/admin/training": "Training",
  "/admin/templates": "Templates",
  "/admin/users": "Admin Users",
  "/admin/lanes-planes": "Lanes & Planes",
  "/admin/jobs": "School Projects",
  "/admin": "Home",
};

export const SIDEBAR_LABELS_EXTENDED: Record<string, string> = {
  ...SIDEBAR_LABELS,
};

/**
 * Navigate to an admin page. Uses storageState if available,
 * otherwise logs in. Then navigates via sidebar or direct URL.
 */
export async function adminGoto(page: Page, path: string) {
  // Navigate directly to the target — storageState or prior login handles auth
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/auth/")) {
      // Need to log in — if this fails (e.g. rate limited), let the test handle it
      try {
        await loginAsAdmin(page);
      } catch {
        console.log("loginAsAdmin failed (likely rate limited) — returning current URL to caller");
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
