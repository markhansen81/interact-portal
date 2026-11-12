import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { templateDefaults } from "@/lib/email-templates";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!templateDefaults[id]) {
    return NextResponse.json({ error: "Unknown template ID" }, { status: 404 });
  }

  const body = await request.json();
  const { subject, html_body } = body as { subject: string; html_body: string };

  if (!subject?.trim() || !html_body?.trim()) {
    return NextResponse.json({ error: "subject and html_body are required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("email_templates")
    .upsert({
      id,
      name: id,
      trigger_desc: "",
      recipients: "",
      language: "en",
      subject: subject.trim(),
      html_body: html_body.trim(),
    }, { onConflict: "id" })
    .select("id, subject, html_body, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ template: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  await adminClient.from("email_templates").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
