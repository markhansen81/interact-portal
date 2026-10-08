import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;

  return profile;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getAdminUser();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !["sent", "booked", "paid"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: sent, booked, paid" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const updateData: Record<string, string> = { status };

  if (status === "booked") {
    updateData.booked_at = new Date().toISOString();
  }

  if (status === "paid") {
    updateData.paid_at = new Date().toISOString();
  }

  const { data, error } = await adminClient
    .from("admin_uploads")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[UPLOAD] Status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, upload: data });
}
