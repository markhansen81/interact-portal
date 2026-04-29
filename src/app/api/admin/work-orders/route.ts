import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const body = await request.json();
  const adminClient = createAdminClient();

  // Generate project ID
  const projectId = `WO-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await adminClient
    .from("work_orders")
    .insert({
      ta_id: body.ta_id,
      job_id: body.job_id || null,
      project_id_internal: projectId,
      project_name: body.project_name,
      school: body.school,
      school_address: body.school_address,
      school_state: body.school_state,
      location: body.location,
      start_date: body.start_date,
      end_date: body.end_date,
      days: body.days,
      program_type: body.program_type,
      daily_rate: body.daily_rate,
      total: body.total,
      special_conditions: body.special_conditions,
      co_taught: body.co_taught,
      grade: body.grade,
      accommodation: body.accommodation,
      notes: body.notes,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, workOrder: data });
}
