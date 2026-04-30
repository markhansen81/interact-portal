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

  // Get current version
  const { data: current } = await adminClient
    .from("work_order_templates")
    .select("version")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (current?.version || 0) + 1;

  // Deactivate old templates
  await adminClient
    .from("work_order_templates")
    .update({ active: false })
    .eq("active", true);

  // Create new version
  const { error } = await adminClient.from("work_order_templates").insert({
    name: "Default",
    version: nextVersion,
    body_html: body.body_html,
    conditions_html: body.conditions_html || null,
    active: true,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, version: nextVersion });
}
