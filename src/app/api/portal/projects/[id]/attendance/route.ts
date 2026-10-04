import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyProjectAccess(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, userId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("ta_id", userId)
    .single();

  if (project) return true;

  const adminClient = createAdminClient();
  const { data: taLink } = await adminClient
    .from("project_tas")
    .select("id")
    .eq("project_id", projectId)
    .eq("ta_id", userId)
    .single();

  return !!taLink;
}

export async function GET(
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

  const hasAccess = await verifyProjectAccess(supabase, id, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const adminClient = createAdminClient();

  // Get all students for this project's groups, then their attendance records
  const { data: groups } = await adminClient
    .from("project_groups")
    .select("id")
    .eq("project_id", id);

  if (!groups || groups.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const groupIds = groups.map((g) => g.id);

  const { data: students } = await adminClient
    .from("project_students")
    .select("id")
    .in("group_id", groupIds);

  if (!students || students.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const studentIds = students.map((s) => s.id);

  const { data: records, error } = await adminClient
    .from("attendance_records")
    .select("*")
    .in("student_id", studentIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ records: records || [] });
}

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

  const hasAccess = await verifyProjectAccess(supabase, id, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { student_id, date, status } = body;

  if (!student_id || !date) {
    return NextResponse.json({ error: "student_id and date are required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (status === null) {
    // Remove record
    await adminClient
      .from("attendance_records")
      .delete()
      .eq("student_id", student_id)
      .eq("date", date);

    return NextResponse.json({ success: true });
  }

  // Upsert attendance record
  const { data: record, error } = await adminClient
    .from("attendance_records")
    .upsert(
      { student_id, date, status },
      { onConflict: "student_id,date" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ record });
}
