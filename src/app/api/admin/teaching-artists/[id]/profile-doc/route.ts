import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "school" or "homestay"

  const adminClient = createAdminClient();
  const { data: docs } = await adminClient
    .from("ta_profile_docs")
    .select("school_html, homestay_html")
    .eq("ta_id", id)
    .single();

  if (!docs) return NextResponse.json({ error: "No docs found" }, { status: 404 });

  const html = type === "homestay" ? docs.homestay_html : docs.school_html;
  if (!html) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
