import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeDatevToken } from "@/lib/datev-api";

/**
 * GET /api/auth/datev/callback
 *
 * OAuth2 callback from DATEV. Exchanges the authorization code for tokens,
 * stores them in the `datev_tokens` table, and redirects back to the
 * admin DATEV settings page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = `${baseUrl}/admin/datev-settings`;

  // Handle DATEV error responses
  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    console.error("[DATEV] OAuth error:", desc);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(desc)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Missing code or state")}`
    );
  }

  // Verify state matches cookie
  const cookieStore = await cookies();
  const savedState = cookieStore.get("datev_oauth_state")?.value;
  const codeVerifier = cookieStore.get("datev_code_verifier")?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Invalid state — possible CSRF")}`
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Missing PKCE code verifier")}`
    );
  }

  // Clear the one-time cookies
  cookieStore.delete("datev_oauth_state");
  cookieStore.delete("datev_code_verifier");

  // Verify the caller is an admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Not authenticated")}`
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Admin access required")}`
    );
  }

  // Exchange auth code for tokens
  const redirectUri = `${baseUrl}/api/auth/datev/callback`;

  try {
    const tokens = await exchangeDatevToken(code, redirectUri, codeVerifier);

    // Store tokens in Supabase
    const adminClient = createAdminClient();

    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Upsert — one row per organisation (we only have one)
    const { error: dbError } = await adminClient
      .from("datev_tokens")
      .upsert(
        {
          id: "default",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (dbError) {
      console.error("[DATEV] Failed to store tokens:", dbError);
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Failed to save tokens")}`
      );
    }

    return NextResponse.redirect(`${settingsUrl}?success=1`);
  } catch (err) {
    console.error("[DATEV] Token exchange failed:", err);
    const msg = err instanceof Error ? err.message : "Token exchange failed";
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(msg)}`
    );
  }
}
