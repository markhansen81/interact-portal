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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://interact-portal.vercel.app";

  // Check if user already exists in auth
  const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    // New user — create via generateLink
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${appUrl}/auth/callback?source=admin` },
    });

    if (linkError || !linkData?.user) {
      return NextResponse.json({ error: linkError?.message ?? "Failed to create user" }, { status: 400 });
    }
    userId = linkData.user.id;
  }

  // Upsert profile with admin role
  await adminClient
    .from("profiles")
    .upsert({
      id: userId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      role: "admin",
    }, { onConflict: "id" });

  // Send invite email — admin portal uses Google SSO only
  const displayName = firstName || "there";

  await sendEmail({
    to: email,
    subject: "InterACT Portal — You've been added as an Admin",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #18181b; font-size: 24px;">Welcome to InterACT Admin</h1>
        <p>Hi ${displayName},</p>
        <p>You've been added as an admin on the InterACT Portal. You can log in using your <strong>InterACT Google account</strong> (${email}).</p>
        <p style="margin: 32px 0;">
          <a href="${appUrl}/auth/admin" style="display: inline-block; background: #18181b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Log In with Google
          </a>
        </p>
        <p style="color: #71717a; font-size: 14px;">Click the button above and sign in with your @interactenglish.de Google account.</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          InterACT English gGmbH<br/>
          Planufer 92B, 10967 Berlin<br/>
          info@interactenglish.de
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, userId });
}
