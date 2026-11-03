import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit";

function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { ok: rlOk } = rateLimit(`otp-send:${ip}`, 5, 60_000);
  if (!rlOk) return rateLimitResponse();

  const { token, email } = await req.json();

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
    // Return generic error to avoid email enumeration
    return NextResponse.json({ error: "Email not recognised for this project" }, { status: 403 });
  }

  // Delete any existing unverified sessions for this token
  await supabase
    .from("school_otp_sessions")
    .delete()
    .eq("project_token", token)
    .is("verified_at", null);

  // Generate OTP — expires in 15 minutes
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase.from("school_otp_sessions").insert({
    project_token: token,
    email: email.toLowerCase(),
    otp_code: otp,
    expires_at: expiresAt,
  });

  // Send OTP email
  const schoolName = project.school || "your school";
  const teacherName = project.teacher_name || "Teacher";

  const result = await sendEmail({
    to: email,
    subject: `Your InterACT School Portal code: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #0d9488; padding: 24px; text-align: center;">
          <span style="color: white; font-size: 20px; font-weight: bold;">InterACT English</span>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">School Portal</p>
        </div>
        <div style="padding: 32px 24px; background: #fff;">
          <p style="margin: 0 0 16px; color: #374151;">Hallo ${teacherName},</p>
          <p style="margin: 0 0 24px; color: #374151;">
            Here is your one-time verification code for the <strong>${schoolName}</strong> project portal.
            This code expires in <strong>15 minutes</strong>.
          </p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #111827; font-family: monospace;">${otp}</span>
          </div>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            If you didn't request this code, please ignore this email.
            Someone may have entered your email address by mistake.
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
