import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listDatevClients,
  refreshDatevToken,
} from "@/lib/datev-api";

/**
 * GET /api/auth/datev/clients
 *
 * Returns the list of DATEV clients available to the connected account.
 * Automatically refreshes the access token if it has expired.
 */
export async function GET() {
  // Verify admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  const { data: tokenRow } = await adminClient
    .from("datev_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (!tokenRow) {
    return NextResponse.json(
      { error: "DATEV not connected" },
      { status: 400 }
    );
  }

  let accessToken = tokenRow.access_token;

  // Refresh if expired
  if (new Date(tokenRow.expires_at) < new Date()) {
    try {
      const refreshed = await refreshDatevToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;

      await adminClient
        .from("datev_tokens")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(
            Date.now() + refreshed.expires_in * 1000
          ).toISOString(),
        })
        .eq("id", "default");
    } catch (err) {
      console.error("[DATEV] Token refresh failed:", err);
      return NextResponse.json(
        { error: "Token refresh failed — please reconnect" },
        { status: 401 }
      );
    }
  }

  try {
    const clients = await listDatevClients(accessToken);
    return NextResponse.json({ clients });
  } catch (err) {
    console.error("[DATEV] Failed to list clients:", err);
    return NextResponse.json(
      { error: "Failed to fetch DATEV clients" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/datev/clients
 *
 * Save the selected DATEV client ID + name.
 */
export async function POST(request: Request) {
  // Verify admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { clientId, clientName } = body as {
    clientId: string;
    clientName: string;
  };

  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { error: dbError } = await adminClient
    .from("datev_tokens")
    .update({
      selected_client_id: clientId,
      selected_client_name: clientName || null,
    })
    .eq("id", "default");

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
