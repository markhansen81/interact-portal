import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSchoolProfile, generateHomestayProfile, PROFILE_FIELDS, ProfileData } from "@/lib/ta-profile-docs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data: ta } = await adminClient.from("profiles").select(PROFILE_FIELDS + ", id, photo_url").eq("id", id).single();
  if (!ta) return NextResponse.json({ error: "TA not found" }, { status: 404 });

  const schoolDoc = generateSchoolProfile(ta as ProfileData);
  const homestayDoc = generateHomestayProfile(ta as ProfileData);

  await adminClient.from("ta_profile_docs").upsert({
    ta_id: id,
    school_html: schoolDoc.content,
    homestay_html: homestayDoc.content,
    generated_at: new Date().toISOString(),
    generated_by: user.id,
  }, { onConflict: "ta_id" });

  return NextResponse.json({ success: true });
}
