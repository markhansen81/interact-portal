import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { workOrderSentEmail } from "@/lib/email";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const adminClient = createAdminClient();

  // Update status to sent
  const { data: wo, error } = await adminClient
    .from("work_orders")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, profiles!work_orders_ta_id_fkey(id, first_name, last_name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notify TA
  const ta = wo.profiles as { id: string; first_name: string; last_name: string; email: string };
  const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;
  const emailTemplate = workOrderSentEmail(taName, wo.project_name, wo.sign_by);

  await notify({
    userId: ta.id,
    type: "work_order_sent",
    title: "New Work Order",
    body: `You have a new work order for ${wo.project_name}`,
    payload: { work_order_id: id },
    email: { to: ta.email, ...emailTemplate },
  });

  return NextResponse.json({ success: true });
}
