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

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://interact-portal.vercel.app";

  // Generate a magic invite link (no password created)
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${appUrl}/auth/invite/confirm`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? "Failed to generate invite link" }, { status: 400 });
  }

  const inviteUrl = linkData.properties.action_link;

  // Update profile with name if provided (user record was created by generateLink)
  if (linkData.user && (firstName || lastName)) {
    await adminClient
      .from("profiles")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
      })
      .eq("id", linkData.user.id);
  }

  // Send branded invite email
  const displayName = firstName || "there";

  await sendEmail({
    to: email,
    subject: "You're invited to the InterACT Teaching Artist Portal",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b; font-size: 24px;">Welcome to InterACT Portal</h1>
        <p>Hi ${displayName},</p>
        <p>You've been invited to the InterACT English Teaching Artist Portal — your hub for work orders, invoices, and projects.</p>
        <p>Click the button below to accept your invitation and set up your account. The link is valid for 24 hours.</p>
        <p style="margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #E91E8C; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #71717a; font-size: 14px;">Once you're in, you'll complete a short onboarding profile (personal info, qualifications, documents). It only takes a few minutes.</p>
        <p style="color: #71717a; font-size: 14px;">If you have any questions, reply to this email.</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          InterACT English gGmbH<br/>
          Planufer 92B, 10967 Berlin<br/>
          info@interactenglish.de
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, emailSent: true });
}
