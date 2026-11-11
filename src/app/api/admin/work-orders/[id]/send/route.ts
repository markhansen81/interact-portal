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

  // Fetch WO to get ta_id
  const { data: woDraft } = await adminClient
    .from("work_orders")
    .select("ta_id")
    .eq("id", id)
    .single();

  if (woDraft?.ta_id) {
    // Check compliance docs: RTW (visa/passport/right_to_work), police_check, measles
    const { data: docs } = await adminClient
      .from("documents")
      .select("type, status, expiry_date")
      .eq("ta_id", woDraft.ta_id)
      .in("status", ["approved", "uploaded"]);

    const today = new Date().toISOString().split("T")[0];
    const docMap: Record<string, { status: string; expiry_date: string | null }> = {};
    for (const d of docs || []) {
      // Keep the most recently processed one (approved preferred over uploaded)
      if (!docMap[d.type] || d.status === "approved") {
        docMap[d.type] = { status: d.status, expiry_date: d.expiry_date };
      }
    }

    const isValid = (type: string) => {
      const d = docMap[type];
      if (!d) return false;
      if (d.expiry_date && d.expiry_date < today) return false;
      return true;
    };

    const missingDocs: string[] = [];
    const hasRtw = isValid("right_to_work") || isValid("visa") || isValid("passport");
    if (!hasRtw) missingDocs.push("Right to Work (visa or passport)");
    if (!isValid("police_check")) missingDocs.push("Police Check");
    if (!isValid("measles")) missingDocs.push("Measles Vaccination");

    if (missingDocs.length > 0) {
      return NextResponse.json(
        { error: `Cannot send: TA is missing or has expired: ${missingDocs.join(", ")}` },
        { status: 400 }
      );
    }
  }

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
