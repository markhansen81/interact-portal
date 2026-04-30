import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

interface NotifyOptions {
  userId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  email?: {
    to: string;
    subject: string;
    html: string;
  };
}

export async function notify({ userId, type, title, body, payload, email }: NotifyOptions) {
  const adminClient = createAdminClient();

  // Create in-app notification
  await adminClient.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    payload,
  });

  // Send email if provided
  if (email) {
    await sendEmail(email);
  }
}

export async function notifyAdmins(options: Omit<NotifyOptions, "userId">) {
  const adminClient = createAdminClient();

  const { data: admins } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("role", "admin");

  if (!admins) return;

  for (const admin of admins) {
    await notify({ ...options, userId: admin.id });
  }
}
