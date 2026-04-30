import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const adminClient = createAdminClient();

  // Handle cancellation
  if (body.status === "cancelled") {
    const { data: wo, error } = await adminClient
      .from("work_orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("*, profiles!work_orders_ta_id_fkey(id, first_name, last_name, email)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Notify TA if the work order was already sent or signed
    if (wo && ["sent", "signed"].includes(body.previous_status || "")) {
      const ta = wo.profiles as { id: string; first_name: string; last_name: string; email: string };
      const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;

      await notify({
        userId: ta.id,
        type: "work_order_cancelled",
        title: "Work Order Cancelled",
        body: `Your work order for ${wo.project_name} has been cancelled by InterACT.${body.reason ? ` Reason: ${body.reason}` : ""}`,
        email: {
          to: ta.email,
          subject: `Work Order Cancelled: ${wo.project_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Work Order Cancelled</h2>
              <p>Hi ${taName},</p>
              <p>Your work order for <strong>${wo.project_name}</strong> has been cancelled.</p>
              ${body.reason ? `<p><strong>Reason:</strong> ${body.reason}</p>` : ""}
              <p>If you have questions, please contact us through the portal.</p>
              <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
            </div>
          `,
        },
      });
    }

    const taForLog = wo.profiles as { id: string; first_name: string; last_name: string } | null;
    await logActivity({
      jobId: wo.job_id,
      workOrderId: id,
      taId: wo.ta_id,
      action: "work_order_cancelled",
      details: `Cancelled by admin${body.reason ? `: ${body.reason}` : ""}. TA: ${taForLog?.first_name || ""} ${taForLog?.last_name || ""}`,
      performedBy: user.id,
    });

    return NextResponse.json({ success: true });
  }

  // Regular field updates
  const allowedFields = [
    "project_name", "school", "school_address", "school_state", "location",
    "start_date", "end_date", "days", "program_type", "daily_rate", "total",
    "special_conditions", "co_taught", "grade", "accommodation", "sign_by", "notes",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  const { error } = await adminClient
    .from("work_orders")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
