import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select("id")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: tasks, error } = await adminClient
    .from("teacher_tasks")
    .select("*")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ tasks: tasks || [] });
}
