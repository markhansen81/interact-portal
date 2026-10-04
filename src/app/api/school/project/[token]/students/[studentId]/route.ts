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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; studentId: string }> }
) {
  const { token, studentId } = await params;
  const project = await getProjectByToken(token);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ("needs_notes" in body) updates.needs_notes = body.needs_notes;
  if ("first_name" in body) updates.first_name = body.first_name;
  if ("last_name" in body) updates.last_name = body.last_name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: updated, error } = await adminClient
    .from("project_students")
    .update(updates)
    .eq("id", studentId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ student: updated });
}
