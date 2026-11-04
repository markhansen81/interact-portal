import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminClient = createAdminClient();

  // Verify the claim belongs to this TA
  const { data: claim } = await adminClient
    .from("expense_claims")
    .select("id, ta_id")
    .eq("id", id)
    .single();

  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.ta_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const storagePath = `expenses/${id}.pdf`;
  const { data, error } = await adminClient.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
