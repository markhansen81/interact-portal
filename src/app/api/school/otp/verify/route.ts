import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { token, email, otp } = await req.json();

  if (!token || !email || !otp) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find a matching, unexpired, unverified session
  const { data: session } = await supabase
    .from("school_otp_sessions")
    .select("id, otp_code, expires_at, verified_at")
    .eq("project_token", token)
    .eq("email", email.toLowerCase())
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    return NextResponse.json({ error: "No active session. Please request a new code." }, { status: 403 });
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 403 });
  }

  if (session.otp_code !== otp.trim()) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 403 });
  }

  // Generate session key — valid for 24 hours
  const sessionKey = randomBytes(32).toString("hex");
  const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("school_otp_sessions")
    .update({
      verified_at: new Date().toISOString(),
      session_key: sessionKey,
      expires_at: sessionExpiry,
    })
    .eq("id", session.id);

  // Set httpOnly cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set("school_session", sessionKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/school",
  });

  return response;
}
