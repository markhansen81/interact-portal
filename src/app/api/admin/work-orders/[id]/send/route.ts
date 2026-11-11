import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { workOrderSentEmail } from "@/lib/email";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyWorkOrderEvent } from "@/lib/slack";

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
  await notify({
    userId: ta.id,
    type: "work_order_sent",
    title: "New Work Order",
    body: `You have a new work order for ${wo.project_name}`,
    payload: { link: `/portal/work-orders/${id}` },
  });

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  await sendTemplatedEmail({
    templateId: "work-order-sent",
    vars: {
      TA_NAME: taName,
      PROJECT_NAME: wo.project_name ?? "",
      WO_URL: `${APP_URL}/portal/work-orders/${id}`,
    },
    fallback: workOrderSentEmail(taName, wo.project_name, wo.sign_by, id),
    to: ta.email,
  });

  // Slack notification
  await notifyWorkOrderEvent({
    event: "sent",
    taName,
    projectName: wo.project_name,
    school: wo.school,
  });

  const { logActivity } = await import("@/lib/activity-log");
  await logActivity({
    jobId: wo.job_id,
    workOrderId: id,
    taId: ta.id,
    action: "work_order_sent",
    details: `Sent to ${taName}`,
    performedBy: user.id,
  });

  return NextResponse.json({ success: true });
}
