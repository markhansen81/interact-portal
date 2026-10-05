import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { workOrderSentEmail } from "@/lib/email";
import { notifyWorkOrderEvent } from "@/lib/slack";
import { logActivity } from "@/lib/activity-log";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const taIds: string[] = body.ta_ids;
  const signBy: string | null = body.sign_by || null;

  if (!taIds || taIds.length === 0) {
    return NextResponse.json({ error: "No TAs selected" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Fetch project details
  const { data: project } = await adminClient
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch TA profiles
  const { data: tas } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, pay_level")
    .in("id", taIds);

  if (!tas || tas.length === 0) {
    return NextResponse.json({ error: "TAs not found" }, { status: 404 });
  }

  // Fetch pay scales
  const { data: payScales } = await adminClient
    .from("pay_scales")
    .select("level, daily_rate");

  const payScaleMap = new Map<number, number>();
  for (const ps of payScales || []) {
    payScaleMap.set(ps.level, Number(ps.daily_rate));
  }

  const createdWoIds: string[] = [];
  const errors: string[] = [];

  for (const ta of tas) {
    try {
      const dailyRate = payScaleMap.get(ta.pay_level || 1) || 0;
      const total = dailyRate * (project.days || 0);
      const projectIdInternal = `WO-${Date.now().toString(36).toUpperCase()}`;

      // Create work order
      const { data: wo, error: woError } = await adminClient
        .from("work_orders")
        .insert({
          ta_id: ta.id,
          project_id: id,
          project_id_internal: projectIdInternal,
          project_name: project.name,
          school: project.school,
          school_address: project.school_address,
          location: project.location,
          start_date: project.start_date,
          end_date: project.end_date,
          days: project.days,
          program_type: project.program_type,
          daily_rate: dailyRate,
          total,
          sign_by: signBy,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (woError || !wo) {
        errors.push(`Failed to create WO for ${ta.email}: ${woError?.message}`);
        continue;
      }

      createdWoIds.push(wo.id);

      // Add to project_tas if not already assigned
      await adminClient
        .from("project_tas")
        .upsert(
          { project_id: id, ta_id: ta.id, role: "ta" },
          { onConflict: "project_id,ta_id" }
        );

      // Send notification and email
      const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;
      const emailTemplate = workOrderSentEmail(taName, project.name, signBy, wo.id);

      await notify({
        userId: ta.id,
        type: "work_order_sent",
        title: "New Work Order",
        body: `You have a new work order for ${project.name}`,
        payload: { link: `/portal/work-orders/${wo.id}` },
        email: { to: ta.email, ...emailTemplate },
      });

      // Slack notification
      await notifyWorkOrderEvent({
        event: "sent",
        taName,
        projectName: project.name,
        school: project.school || "",
      });

      // Log activity
      await logActivity({
        workOrderId: wo.id,
        taId: ta.id,
        action: "work_order_sent",
        details: `Sent to ${taName} via staffing wizard`,
        performedBy: user.id,
      });
    } catch (err) {
      errors.push(`Error for ${ta.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    created: createdWoIds,
    errors: errors.length > 0 ? errors : undefined,
  });
}
