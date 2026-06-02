import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Upsert document record
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("ta_id", user.id)
    .eq("type", body.type)
    .single();

  if (existing) {
    await supabase
      .from("documents")
      .update({
        file_url: body.file_url,
        uploaded_at: new Date().toISOString(),
        issue_date: body.issue_date || null,
        expiry_date: body.expiry_date || null,
        status: "uploaded",
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("documents").insert({
      ta_id: user.id,
      type: body.type,
      file_url: body.file_url,
      uploaded_at: new Date().toISOString(),
      issue_date: body.issue_date || null,
      expiry_date: body.expiry_date || null,
      status: "uploaded",
    });
  }

  // Create admin review task
  const docLabels: Record<string, string> = {
    right_to_work: "Right to Work",
    police_check: "Police Check",
    measles: "Measles Vaccination",
    first_aid: "First Aid Certificate",
  };

  const { data: ta } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const taName = ta ? `${ta.first_name} ${ta.last_name}` : "A TA";
  const docLabel = docLabels[body.type] || body.type;

  // Remove any existing pending review for same doc
  await supabase
    .from("admin_review_tasks")
    .delete()
    .eq("ta_id", user.id)
    .eq("reference_id", body.type)
    .eq("type", "document_upload")
    .eq("status", "pending");

  await supabase.from("admin_review_tasks").insert({
    type: "document_upload",
    ta_id: user.id,
    reference_id: body.type,
    title: `${docLabel} uploaded`,
    description: `${taName} uploaded their ${docLabel}. Review and verify.`,
  });

  // Notify admins
  await notifyAdmins({
    type: "document_uploaded",
    title: `${docLabel} uploaded`,
    body: `${taName} uploaded their ${docLabel}. Review and verify.`,
    payload: { link: "/admin", ta_id: user.id },
  });

  return NextResponse.json({ success: true });
}
