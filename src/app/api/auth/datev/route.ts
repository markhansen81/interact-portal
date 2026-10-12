import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getDatevAuthUrl } from "@/lib/datev-api";

/**
 * GET /api/auth/datev
 *
 * Initiates the DATEV OAuth2 flow. Requires the caller to be an admin.
 * Stores the PKCE code_verifier in an HTTP-only cookie so the callback
 * route can retrieve it.
 */
export async function GET() {
  // Verify admin auth
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

  // Build redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/datev/callback`;

  // Random state to prevent CSRF
  const state = crypto.randomBytes(16).toString("hex");

  // Generate PKCE auth URL
  const { url, codeVerifier } = getDatevAuthUrl(redirectUri, state);

  // Store code_verifier + state in HTTP-only cookies (short-lived)
  const cookieStore = await cookies();
  cookieStore.set("datev_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  cookieStore.set("datev_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(url);
}
