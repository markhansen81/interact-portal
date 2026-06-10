import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
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

  const { email, firstName, lastName } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!email.endsWith("@interactenglish.de")) {
    return NextResponse.json({ error: "Only @interactenglish.de emails can be admin users" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const tempPassword =
    Math.random().toString(36).slice(-8) +
    Math.random().toString(36).slice(-8).toUpperCase() +
    "!1";

  const { data: newUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (newUser.user) {
    await adminClient
      .from("profiles")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        role: "admin",
      })
      .eq("id", newUser.user.id);
  }

  // Send invite email
  const displayName = firstName || "Admin";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://interact-portal.vercel.app";

  await sendEmail({
    to: email,
    subject: "InterACT Portal — Admin Account Created",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b; font-size: 24px;">Welcome to InterACT Admin</h1>
        <p>Hi ${displayName},</p>
        <p>You've been added as an admin on the InterACT Portal. Here are your login credentials:</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #71717a;">Email</p>
          <p style="margin: 4px 0 16px; font-size: 16px; font-weight: bold; color: #18181b;">${email}</p>
          <p style="margin: 0; font-size: 14px; color: #71717a;">Temporary Password</p>
          <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: #18181b; font-family: monospace;">${tempPassword}</p>
        </div>
        <p style="color: #b45309; font-weight: bold;">Please change your password after your first login.</p>
        <p>
          <a href="${appUrl}/auth/admin" style="display: inline-block; background: #18181b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Log In to Admin Portal
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          InterACT English gGmbH<br/>
          Planufer 92B, 10967 Berlin<br/>
          info@interactenglish.de
        </p>
      </div>
    `,
  });

  return NextResponse.json({
    success: true,
    userId: newUser.user?.id,
    tempPassword,
  });
}
