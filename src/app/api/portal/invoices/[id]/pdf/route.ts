import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Extract storage path from either a public URL or a signed URL
function extractStoragePath(url: string, bucket: string): string | null {
  // Public URL: /storage/v1/object/public/{bucket}/{path}
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const publicIdx = url.indexOf(publicMarker);
  if (publicIdx !== -1) return url.substring(publicIdx + publicMarker.length).split("?")[0];

  // Signed URL: /storage/v1/object/sign/{bucket}/{path}?token=...
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const signedIdx = url.indexOf(signedMarker);
  if (signedIdx !== -1) return url.substring(signedIdx + signedMarker.length).split("?")[0];

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const adminClient = createAdminClient();

  // Verify the invoice belongs to this TA
  const { data: invoice } = await adminClient
    .from("invoices")
    .select("id, ta_id, pdf_url, uploaded_pdf_url")
    .eq("id", id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.ta_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Try generated PDF path first (invoices/{id}.pdf)
  const generatedPath = `invoices/${id}.pdf`;
  let { data, error } = await adminClient.storage
    .from("documents")
    .createSignedUrl(generatedPath, 3600);

  // Fall back to uploaded PDF path extracted from stored URL
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
