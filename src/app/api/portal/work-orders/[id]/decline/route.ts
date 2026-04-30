import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { notifyAdmins } from "@/lib/notifications";

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
  try {
    const body = await request.json();
    reason = body.reason || "";
  } catch {
    // No body is fine
  }

  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ta_id, status, project_name, job_id")
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

  // Get TA name for log
  const { data: ta } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const taName = ta ? `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email : "Unknown";

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
  });

  return NextResponse.json({ success: true });
}
