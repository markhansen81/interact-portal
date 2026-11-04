import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractStoragePath } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: order } = await adminClient
    .from("insurance_orders")
    .select("invoice_pdf_url, order_number")
    .eq("id", id)
    .single();

  if (!order?.invoice_pdf_url) {
    return NextResponse.json({ error: "No PDF found" }, { status: 404 });
  }

  const storagePath = extractStoragePath(order.invoice_pdf_url, "documents");
  if (!storagePath) {
    // URL might already be a signed URL — just redirect
    return NextResponse.redirect(order.invoice_pdf_url);
  }

  const { data, error } = await adminClient.storage
    .from("documents")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate PDF URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
