import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  const supabase = await createClient();
  const { error } = await supabase
    .from("offer_brochure_content")
    .update({
      content,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
