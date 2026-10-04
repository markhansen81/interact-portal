import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: groups, error } = await adminClient
    .from("project_groups")
    .select("*, project_students(*, attendance_records(*))")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ groups: groups || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  if (!(await verifyAdmin(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, grade, english_level, students } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: group, error } = await adminClient
    .from("project_groups")
    .insert({
      project_id: id,
      name: name.trim(),
      grade: grade || null,
      english_level: english_level || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Bulk import students if provided
  if (Array.isArray(students) && students.length > 0) {
    const studentRows = students
      .filter((s: { first_name?: string }) => s.first_name?.trim())
      .map((s: { first_name: string; last_name?: string; needs_notes?: string }) => ({
        group_id: group.id,
        first_name: s.first_name.trim(),
        last_name: s.last_name?.trim() || null,
        needs_notes: s.needs_notes || null,
      }));

    if (studentRows.length > 0) {
      const { data: insertedStudents } = await adminClient
        .from("project_students")
        .insert(studentRows)
        .select("*");

      return NextResponse.json({ group: { ...group, project_students: insertedStudents || [] } });
    }
  }

  return NextResponse.json({ group: { ...group, project_students: [] } });
}
