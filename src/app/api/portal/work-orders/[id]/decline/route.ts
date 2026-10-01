import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { notifyAdmins } from "@/lib/notifications";
import { sendEmail, workOrderDeclinedEmailToAdmin } from "@/lib/email";
import { notifyWorkOrderEvent } from "@/lib/slack";

export async function POST(
  request: Request,
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

  // Get reason if provided
  let reason = "";
  let reasonType = "";
  let updateAvailability = false;
  try {
    const body = await request.json();
    reason = body.reason || "";
    reasonType = body.reason_type || "";
    updateAvailability = body.update_availability || false;
  } catch {
    // No body is fine
  }

  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ta_id, status, project_name, school, job_id, start_date, end_date")
    .eq("id", id)
    .eq("ta_id", user.id)
    .eq("status", "sent")
    .single();

  if (!wo) {
    return NextResponse.json({ error: "Work order not found or not declinable" }, { status: 404 });
  }

  const { error } = await supabase
    .from("work_orders")
    .update({ status: "declined" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-update availability if TA said they're no longer available
  if (updateAvailability && wo.start_date && wo.end_date) {
    const start = new Date(wo.start_date);
    const end = new Date(wo.end_date);
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        dates.push(d.toISOString().split("T")[0]);
      }
    }
    // Delete availability entries (unavailable = no row)
    if (dates.length > 0) {
      await supabase
        .from("availability")
        .delete()
        .eq("ta_id", user.id)
        .in("date", dates);
    }
  }

  // Get TA name for log
  const { data: ta } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const taName = ta ? `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email : "Unknown";

  // Send decline email to admins
  const adminClient = createAdminClient();
  const { data: admins } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("role", "admin");

  if (admins) {
    const emailTemplate = workOrderDeclinedEmailToAdmin(taName, wo.project_name, wo.school, reason || undefined);
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        ...emailTemplate,
      });
    }
  }

  // Slack notification
  await notifyWorkOrderEvent({
    event: "declined",
    taName,
    projectName: wo.project_name,
    school: wo.school,
    reason: reason || undefined,
  });

  await logActivity({
    jobId: wo.job_id,
    workOrderId: id,
    taId: user.id,
    action: "work_order_declined",
    details: `${taName} declined${reason ? `: ${reason}` : ""}`,
    performedBy: user.id,
  });

  await notifyAdmins({
    type: "work_order_declined",
    title: "Work Order Declined",
    body: `${taName} declined the work order for ${wo.project_name}${reason ? `. Reason: ${reason}` : ""}`,
    payload: { link: `/admin/work-orders/${id}` },
  });

  return NextResponse.json({ success: true });
}
