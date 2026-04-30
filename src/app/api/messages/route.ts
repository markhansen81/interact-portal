import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import { newMessageEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to_user_id, body } = await request.json();

  if (!to_user_id || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("messages").insert({
    from_user_id: user.id,
    to_user_id,
    body,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Get sender and recipient names for notification
  const adminClient = createAdminClient();
  const { data: sender } = await adminClient
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const { data: recipient } = await adminClient
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", to_user_id)
    .single();

  if (sender && recipient) {
    const senderName = `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || sender.email;
    const recipientName = `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim() || recipient.email;
    const emailTemplate = newMessageEmail(recipientName, senderName);

    await notify({
      userId: to_user_id,
      type: "new_message",
      title: `Message from ${senderName}`,
      body: body.substring(0, 100),
      email: { to: recipient.email, ...emailTemplate },
    });
  }

  return NextResponse.json({ success: true });
}
