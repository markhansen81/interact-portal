import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function extractStoragePath(url: string, bucket: string): string | null {
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const publicIdx = url.indexOf(publicMarker);
  if (publicIdx !== -1) return url.substring(publicIdx + publicMarker.length).split("?")[0];

  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const signedIdx = url.indexOf(signedMarker);
  if (signedIdx !== -1) return url.substring(signedIdx + signedMarker.length).split("?")[0];

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: invoice } = await adminClient
    .from("invoices")
    .select("id, pdf_url, uploaded_pdf_url")
    .eq("id", id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Try generated PDF path first
  const generatedPath = `invoices/${id}.pdf`;
  let { data, error } = await adminClient.storage
    .from("documents")
    .createSignedUrl(generatedPath, 3600);

  // Fall back to uploaded PDF path
  if ((error || !data?.signedUrl) && invoice.uploaded_pdf_url) {
    const uploadedPath = extractStoragePath(invoice.uploaded_pdf_url, "documents");
    if (uploadedPath) {
      ({ data, error } = await adminClient.storage
        .from("documents")
        .createSignedUrl(uploadedPath, 3600));
    }
  }

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
