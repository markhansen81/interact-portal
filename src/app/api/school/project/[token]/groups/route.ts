import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit";

async function getProjectByToken(token: string) {
  const adminClient = createAdminClient();
  const { data: project } = await adminClient
    .from("projects")
    .select("id")
    .eq("teacher_token", token)
    .single();
  return project;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIP(request);
  const { ok } = rateLimit(`school:${ip}`, 20, 60_000);
  if (!ok) return rateLimitResponse();

  const { token } = await params;
  const project = await getProjectByToken(token);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminClient = createAdminClient();
  const { data: groups, error } = await adminClient
    .from("project_groups")
    .select("*, project_students(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[SCHOOL/GROUPS] GET error:", error.message);
    return NextResponse.json({ error: process.env.NODE_ENV === 'production' ? "Request failed" : error.message }, { status: 400 });
  }

  return NextResponse.json({ groups: groups || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIP(request);
  const { ok } = rateLimit(`school:${ip}`, 20, 60_000);
  if (!ok) return rateLimitResponse();

  const { token } = await params;
  const project = await getProjectByToken(token);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, grade, english_level } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: group, error } = await adminClient
    .from("project_groups")
    .insert({
      project_id: project.id,
      name: name.trim(),
      grade: grade || null,
      english_level: english_level || null,
    })
    .select("*, project_students(*)")
    .single();

  if (error) {
    console.error("[SCHOOL/GROUPS] POST error:", error.message);
    return NextResponse.json({ error: process.env.NODE_ENV === 'production' ? "Request failed" : error.message }, { status: 400 });
  }

  return NextResponse.json({ group });
}
