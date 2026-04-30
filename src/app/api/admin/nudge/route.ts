import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { nudgeEmail } from "@/lib/email";

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

  const { ta_id, item, message } = await request.json();

  const adminClient = createAdminClient();
  const { data: ta } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", ta_id)
    .single();

  if (!ta) {
    return NextResponse.json({ error: "TA not found" }, { status: 404 });
  }

  const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;
  const emailTemplate = nudgeEmail(taName, item, message);

  await notify({
    userId: ta.id,
    type: "nudge",
    title: `Reminder: ${item}`,
    body: message,
    email: { to: ta.email, ...emailTemplate },
  });

  return NextResponse.json({ success: true });
}
