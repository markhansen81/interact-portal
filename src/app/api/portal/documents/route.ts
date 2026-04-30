import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ success: true });
}
