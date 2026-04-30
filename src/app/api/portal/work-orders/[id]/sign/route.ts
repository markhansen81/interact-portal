import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const body = await request.json();

  // Verify this work order belongs to the TA and is in "sent" status
  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ta_id, status, job_id")
    .eq("id", id)
    .eq("ta_id", user.id)
    .eq("status", "sent")
    .single();

  if (!wo) {
    return NextResponse.json({ error: "Work order not found or not signable" }, { status: 404 });
  }

  // Get IP from request headers
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      pdf_url: body.pdf_url || null,
      signature_data: {
        signature_png: body.signature_png,
        signature_type: body.signature_type,
        typed_name: body.typed_name || null,
        timestamp: body.timestamp,
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
      },
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Log activity
  const { logActivity } = await import("@/lib/activity-log");
  await logActivity({
    jobId: wo.job_id,
    workOrderId: id,
    taId: user.id,
    action: "work_order_signed",
    details: "TA signed the work order",
    performedBy: user.id,
  });

  // Notify admins
  const { notifyAdmins } = await import("@/lib/notifications");
  await notifyAdmins({
    type: "work_order_signed",
    title: "Work Order Signed",
    body: `Work order ${id.slice(0, 8)} has been signed`,
  });

  return NextResponse.json({ success: true });
}
