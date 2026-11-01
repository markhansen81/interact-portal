import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export async function POST(req: NextRequest) {
  const { token, email, next } = await req.json();

  if (!token || !email) {
    return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up project by teacher_token
  const { data: project } = await supabase
    .from("projects")
    .select("id, school, teacher_email, teacher_name")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  // Email must match project's teacher_email (case-insensitive)
  if (project.teacher_email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Email not recognised for this project" }, { status: 403 });
  }

  // Clean up old unverified sessions for this token
  await supabase
    .from("school_otp_sessions")
    .delete()
    .eq("project_token", token)
    .is("verified_at", null);

  // Generate a secure magic token — expires in 30 minutes
  const magicToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabase.from("school_otp_sessions").insert({
    project_token: token,
    email: email.toLowerCase(),
    otp_code: magicToken,
    expires_at: expiresAt,
  });

  // Build magic link URL
  const callbackUrl = new URL(`${APP_URL}/api/school/magic-link/callback`);
  callbackUrl.searchParams.set("t", magicToken);
  callbackUrl.searchParams.set("p", token);
  if (next) callbackUrl.searchParams.set("next", next);

  const schoolName = project.school || "your school";
  const teacherName = project.teacher_name || "Teacher";

  const result = await sendEmail({
    to: email,
    subject: `Your InterACT School Portal access link`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #0d9488; padding: 24px; text-align: center;">
          <span style="color: white; font-size: 20px; font-weight: bold;">InterACT English</span>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">School Portal</p>
        </div>
        <div style="padding: 32px 24px; background: #fff;">
          <p style="margin: 0 0 16px; color: #374151;">Hallo ${teacherName},</p>
          <p style="margin: 0 0 24px; color: #374151;">
            Click the button below to access the portal for <strong>${schoolName}</strong>.
            This link expires in <strong>30 minutes</strong> and can only be used once.
          </p>
          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${callbackUrl.toString()}"
               style="display: inline-block; background: #0d9488; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Open School Portal
            </a>
          </div>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
            Or copy this link into your browser:
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 12px; word-break: break-all;">
            ${callbackUrl.toString()}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            If you didn't request this link, please ignore this email.
          </p>
        </div>
        <div style="padding: 16px 24px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            InterACT English gGmbH | Planufer 92B, 10967 Berlin
          </p>
        </div>
      </div>
    `,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
