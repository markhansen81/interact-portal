import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getProjectByToken(token: string) {
  const adminClient = createAdminClient();
  const { data: project } = await adminClient
    .from("projects")
    .select("id")
    .eq("teacher_token", token)
    .single();
  return project;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const project = await getProjectByToken(token);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { group_id, first_name, last_name, needs_notes } = body;

  if (!group_id || !first_name?.trim()) {
    return NextResponse.json(
      { error: "group_id and first_name are required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Verify the group belongs to this project
  const { data: group } = await adminClient
    .from("project_groups")
    .select("id")
    .eq("id", group_id)
    .eq("project_id", project.id)
    .single();

  if (!group) {
    return NextResponse.json(
      { error: "Group not found in this project" },
      { status: 404 }
    );
  }

  const { data: student, error } = await adminClient
    .from("project_students")
    .insert({
      group_id,
      first_name: first_name.trim(),
      last_name: last_name?.trim() || null,
      needs_notes: needs_notes || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ student });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const project = await getProjectByToken(token);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  if (!studentId) {
    return NextResponse.json(
      { error: "student_id is required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Verify student belongs to a group in this project
  const { data: student } = await adminClient
    .from("project_students")
    .select("id, group_id, project_groups!inner(project_id)")
    .eq("id", studentId)
    .single();

  if (
    !student ||
    (student.project_groups as unknown as { project_id: string }).project_id !==
      project.id
  ) {
    return NextResponse.json(
      { error: "Student not found in this project" },
      { status: 404 }
    );
  }

  // Delete attendance records first
  await adminClient
    .from("attendance_records")
    .delete()
    .eq("student_id", studentId);

  const { error } = await adminClient
    .from("project_students")
    .delete()
    .eq("id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
