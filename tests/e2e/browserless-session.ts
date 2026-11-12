/**
 * Browserless persistent session management.
 * Creates one authenticated session per role (admin, ta),
 * reuses it across all tests to save API calls and time.
 */

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_KEY;
const BROWSERLESS_URL = "https://production-sfo.browserless.io";

interface Session {
  wsEndpoint: string;
  id: string;
}

const sessions: Record<string, Session> = {};

/**
 * Create a persistent Browserless session (180s TTL).
 * Returns a WebSocket endpoint to connect Playwright to.
 */
export async function getOrCreateSession(
  role: "admin" | "ta" | "public"
): Promise<string | undefined> {
  if (!BROWSERLESS_TOKEN) return undefined; // local mode, no Browserless

  // Reuse existing session if we have one
  if (sessions[role]) {
    return sessions[role].wsEndpoint;
  }

  // Create a new persistent session
  const res = await fetch(
    `${BROWSERLESS_URL}/session?token=${BROWSERLESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ttl: 300000, // 5 minutes — enough for a test suite
      }),
    }
  );

  if (!res.ok) {
    console.warn(`Browserless session creation failed: ${res.status}`);
    return undefined;
  }

  const data = await res.json();
  const wsEndpoint = data.browserWSEndpoint || data.wsEndpoint;

  if (wsEndpoint) {
    sessions[role] = { wsEndpoint, id: data.id || role };
    console.log(`Browserless session created for ${role}: ${data.id || "ok"}`);
    return wsEndpoint;
  }

  return undefined;
}

/**
 * Check if we're running with Browserless.
 */
export function isBrowserless(): boolean {
  return !!BROWSERLESS_TOKEN;
}
