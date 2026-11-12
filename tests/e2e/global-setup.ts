import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ── All credentials from environment ─────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.TEST_BASE_URL || "https://interact-portal.vercel.app";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const TA_A_EMAIL = process.env.E2E_TA_A_EMAIL!;
const TA_A_PASS = process.env.E2E_TA_A_PASS!;

// Extract project ref from Supabase URL
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

/**
 * Get a Supabase session via magic link (no password, no rate limit).
 * Uses admin.generateLink → extract token → verifyOtp → get session.
 */
async function getSessionViaMagicLink(email: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    console.warn("[global-setup] Missing Supabase env vars — cannot generate session");
    return null;
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.warn(`[global-setup] generateLink failed for ${email}:`, linkError?.message);
    return null;
  }

  const actionUrl = new URL(linkData.properties.action_link);
  const tokenHash = actionUrl.searchParams.get("token");
  if (!tokenHash) {
    console.warn("[global-setup] No token in action_link");
    return null;
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await anonClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (sessionError || !sessionData?.session) {
    console.warn(`[global-setup] verifyOtp failed for ${email}:`, sessionError?.message);
    return null;
  }

  console.log(`[global-setup] Got session via magic link for ${email}`);
  return sessionData.session;
}

/**
 * Inject a Supabase session into a Playwright browser context as cookies.
 */
async function injectSessionIntoBrowser(
  session: { access_token: string; refresh_token: string; expires_at?: number; token_type: string; user: object },
  statePath: string,
  browser: Awaited<ReturnType<typeof chromium.launch>>
) {
  const context = await browser.newContext();

  const sessionValue = JSON.stringify(session);
  const domain = new URL(BASE_URL).hostname;

  // Handle chunking if value > 3180 chars
  const chunkSize = 3180;
  const chunks = [];
  for (let i = 0; i < sessionValue.length; i += chunkSize) {
    chunks.push(sessionValue.slice(i, i + chunkSize));
  }

  const cookieBase = {
    domain,
    path: "/",
    secure: true,
    sameSite: "Lax" as const,
    httpOnly: false,
    expires: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };

  if (chunks.length === 1) {
    await context.addCookies([{ ...cookieBase, name: COOKIE_NAME, value: chunks[0] }]);
  } else {
    const cookies = chunks.map((chunk, i) => ({
      ...cookieBase,
      name: `${COOKIE_NAME}.${i}`,
      value: chunk,
    }));
    await context.addCookies(cookies);
  }

  await context.storageState({ path: statePath });
  await context.close();
  console.log(`[global-setup] Saved session cookies to ${statePath} (${chunks.length} chunk(s))`);
}

async function globalSetup(_config: FullConfig) {
  // Preflight: verify required env vars are set
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "E2E_ADMIN_EMAIL",
    "E2E_TA_A_EMAIL",
    "E2E_TA_A_PASS",
  ].filter((k) => !process.env[k]);

  if (missing.length > 0) {
    throw new Error(
      `[global-setup] Missing required env vars: ${missing.join(", ")}. ` +
      `Set them in .env.test or CI secrets.`
    );
  }

  const browser = await chromium.launch();

  // Admin session via magic link (bypasses rate limiting)
  const adminSession = await getSessionViaMagicLink(ADMIN_EMAIL);
  if (adminSession) {
    await injectSessionIntoBrowser(adminSession, "tests/e2e/.auth/admin.json", browser);
  } else {
    console.warn("[global-setup] Could not get admin session — tests will need to log in manually");
  }

  // TA session via magic link
  const taSession = await getSessionViaMagicLink(TA_A_EMAIL);
  if (taSession) {
    await injectSessionIntoBrowser(taSession, "tests/e2e/.auth/ta.json", browser);
  } else {
    // Fallback: password login for TA
    console.log("[global-setup] Trying password login for TA...");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.waitForLoadState("networkidle");
      if (!page.url().includes("/portal")) {
        await page.locator('input[type="email"]').first().fill(TA_A_EMAIL);
        await page.locator('input[type="password"]').first().fill(TA_A_PASS);
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => url.pathname.startsWith("/portal"), { timeout: 20000 });
      }
      await context.storageState({ path: "tests/e2e/.auth/ta.json" });
    } catch (err) {
      console.warn("[global-setup] TA password login also failed:", err);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

export default globalSetup;
