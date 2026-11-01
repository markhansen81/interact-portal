import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magicToken = searchParams.get("t");
  const projectToken = searchParams.get("p");
  const next = searchParams.get("next");

  if (!magicToken || !projectToken) {
    return new NextResponse("Invalid link", { status: 400 });
  }

  const supabase = createAdminClient();

  // Find matching unverified session
  const { data: session } = await supabase
    .from("school_otp_sessions")
    .select("id, project_token, expires_at, verified_at")
    .eq("otp_code", magicToken)
    .eq("project_token", projectToken)
    .is("verified_at", null)
    .single();

  if (!session) {
    // Link already used or invalid — redirect to verify page
    return NextResponse.redirect(
      new URL(`/school/project/${projectToken}/verify`, req.url)
    );
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.redirect(
      new URL(`/school/project/${projectToken}/verify?expired=1`, req.url)
    );
  }

  // Valid — generate session key (24h)
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

  const destination = next || `/school/project/${projectToken}`;
  const response = NextResponse.redirect(new URL(destination, req.url));

  response.cookies.set("school_session", sessionKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/school",
  });

  return response;
}
