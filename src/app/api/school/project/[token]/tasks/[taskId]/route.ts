import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; taskId: string }> }
) {
  const { token, taskId } = await params;
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select("id")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the task belongs to this project
  const { data: existingTask } = await adminClient
    .from("teacher_tasks")
    .select("id, completed")
    .eq("id", taskId)
    .eq("project_id", project.id)
    .single();

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const completed = body.completed ?? !existingTask.completed;

  const { data: task, error } = await adminClient
    .from("teacher_tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ task });
}
