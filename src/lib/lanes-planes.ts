const LP_API_URL = "https://api.lanes-planes.com/ext/users";
const LP_INVOICE_PROFILE_ID = 4174;

interface LPUser {
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  accounting_invoice_profile_ids: number[];
}

export async function syncTAsToLanesPlanes(
  users: Array<{ first_name: string; last_name: string; email: string }>
): Promise<{ ok: boolean; status: number; error?: string }> {
  const apiKey = process.env.LANES_PLANES_API_KEY;
  if (!apiKey) {
    console.warn("[L&P] No API key configured, skipping sync");
    return { ok: false, status: 0, error: "No API key" };
  }

  const lpUsers: LPUser[] = users.map((u) => ({
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    roles: ["traveller"],
    accounting_invoice_profile_ids: [LP_INVOICE_PROFILE_ID],
  }));

  const payload = JSON.stringify({ users: lpUsers });

  try {
    const res = await fetch(LP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token token=${apiKey}`,
      },
      body: payload,
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[L&P] Sync failed: ${res.status}`, error);
      return { ok: false, status: res.status, error };
    }

    console.log(`[L&P] Synced ${lpUsers.length} users`);
    return { ok: true, status: res.status };
  } catch (error) {
    console.error("[L&P] Sync error:", error);
    return { ok: false, status: 0, error: String(error) };
  }
}
