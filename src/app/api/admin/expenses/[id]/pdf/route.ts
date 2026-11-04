import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: expense } = await adminClient
    .from("expense_claims")
    .select("id, pdf_url")
    .eq("id", id)
    .single();

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const storagePath = `expenses/${id}.pdf`;
  const { data, error } = await adminClient.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
