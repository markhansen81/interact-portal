/**
 * Assign a TA to a Church slot
 *
 * 1. Updates the church_ta_slot with the TA
 * 2. Creates a work order for the TA
 * 3. Logs the action
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Verify admin auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slotId, taId, churchItemId } = await request.json();
  if (!slotId || !taId || !churchItemId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Get the church item for work order details
  const { data: churchItem } = await adminClient
    .from("church_items")
    .select("*")
    .eq("id", churchItemId)
    .single();

  if (!churchItem) {
    return NextResponse.json({ error: "Church item not found" }, { status: 404 });
  }

  // Check if this TA is already assigned to this church item
  const { data: existingSlot } = await adminClient
    .from("church_ta_slots")
    .select("id")
    .eq("church_item_id", churchItemId)
    .eq("ta_id", taId)
    .maybeSingle();

  if (existingSlot) {
    return NextResponse.json({ error: "TA already assigned to this project" }, { status: 400 });
  }

  // Find or create the corresponding job record
  let jobId: string | null = null;
  if (churchItem.monday_opp_id || churchItem.monday_project_id) {
    const mondayId = churchItem.monday_project_id || churchItem.monday_opp_id;
    const { data: job } = await adminClient
      .from("jobs")
      .select("id")
      .eq("monday_item_id", mondayId)
      .maybeSingle();
    jobId = job?.id || null;
  }

  // If no job exists, create one from church item data
  if (!jobId) {
    const { data: newJob } = await adminClient
      .from("jobs")
      .insert({
        monday_item_id: churchItem.monday_project_id || churchItem.monday_opp_id || churchItem.id,
        monday_board_id: churchItem.source === "project" ? "6976340557" : "6976340562",
        title: churchItem.school_name || churchItem.name,
        school: churchItem.school_name || churchItem.name,
        school_address: [churchItem.street, churchItem.postcode, churchItem.city].filter(Boolean).join(", "),
        school_state: churchItem.state,
        location: churchItem.state,
        start_date: churchItem.start_date,
        end_date: churchItem.end_date,
        days: churchItem.num_days,
        program_type: churchItem.program_type,
        grade: churchItem.grade_level,
        accommodation: churchItem.accommodation,
        special_conditions: churchItem.staffing_notes,
        co_taught: churchItem.co_taught?.toLowerCase().includes("co"),
        tas_needed: churchItem.num_tas || 0,
        status: "open",
      })
      .select("id")
      .single();
    jobId = newJob?.id || null;
  }

  // Create work order
  let workOrderId: string | null = null;
  if (jobId) {
    const { data: wo } = await adminClient
      .from("work_orders")
      .insert({
        job_id: jobId,
        ta_id: taId,
        status: "draft",
        program_type: churchItem.program_type,
        start_date: churchItem.start_date,
        end_date: churchItem.end_date,
      })
      .select("id")
      .single();
    workOrderId = wo?.id || null;
  }

  // Update the slot
  await adminClient
    .from("church_ta_slots")
    .update({
      ta_id: taId,
      work_order_id: workOrderId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  // Log the action
  await adminClient.from("activity_log").insert({
    action: "ta_assigned_via_church",
    job_id: jobId,
    ta_id: taId,
    performed_by: user.id,
    details: `Assigned to ${churchItem.school_name || churchItem.name} via Church view`,
  });

  return NextResponse.json({
    ok: true,
    slotId,
    taId,
    workOrderId,
    jobId,
  });
}
