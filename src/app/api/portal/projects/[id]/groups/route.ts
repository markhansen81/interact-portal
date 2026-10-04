import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyProjectAccess(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, userId: string) {
  // Check via projects.ta_id
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("ta_id", userId)
    .single();

  if (project) return true;

  // Check via project_tas
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
  const { data: groups, error } = await adminClient
    .from("project_groups")
    .select("*, project_students(*)")
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
  const { name, grade, english_level } = body;

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

  return NextResponse.json({ group });
}
