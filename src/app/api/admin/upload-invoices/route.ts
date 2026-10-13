import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToDATEV } from "@/lib/datev";

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

export async function POST(request: Request) {
  const profile = await getAdminUser();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const documentType = formData.get("document_type") as string;
  const description = (formData.get("description") as string) || "";
  const supplier = (formData.get("supplier") as string) || "";
  const invoiceNumber = (formData.get("invoice_number") as string) || null;
  const amountStr = formData.get("amount") as string;
  const invoiceDate = (formData.get("invoice_date") as string) || null;
  const dueDate = (formData.get("due_date") as string) || null;

  if (!file || !documentType) {
    return NextResponse.json(
      { error: "File and document type are required" },
      { status: 400 }
    );
  }

  if (!supplier.trim()) {
    return NextResponse.json(
      { error: "Supplier is required" },
      { status: 400 }
    );
  }

  const amount = amountStr ? parseFloat(amountStr) : null;
  if (amount == null || isNaN(amount)) {
    return NextResponse.json(
      { error: "Amount is required" },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Upload to Supabase storage
  const timestamp = Date.now();
  const storagePath = `admin-uploads/${timestamp}-${file.name}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[UPLOAD] Storage error:", uploadError);
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("documents").getPublicUrl(storagePath);

  // Send to DATEV (API first, email fallback)
  const belegNumber = invoiceNumber || `ADM-${Date.now()}`;

  const datevResult = await sendToDATEV({
    pdf: fileBuffer,
    filename: file.name,
    belegNumber,
    taName: supplier,
    type: "invoice",
  });

  if (!datevResult.ok) {
    console.error("[UPLOAD] DATEV send failed:", datevResult.error);
    return NextResponse.json(
      { error: "Failed to send document to DATEV" },
      { status: 500 }
    );
  }

  console.log(`[UPLOAD] Sent to DATEV via ${datevResult.method}`, datevResult.documentId ?? "");

  // Save record — mark as 'received' if API confirmed with a document ID
  const uploadStatus = datevResult.method === "api" && datevResult.documentId ? "received" : "sent";

  const { data: record, error: insertError } = await adminClient
    .from("admin_uploads")
    .insert({
      uploaded_by: profile.id,
      filename: file.name,
      document_type: documentType,
      description: description || null,
      supplier: supplier.trim(),
      invoice_number: invoiceNumber || null,
      amount,
      invoice_date: invoiceDate || null,
      due_date: dueDate || null,
      pdf_url: publicUrl,
      datev_sent_at: new Date().toISOString(),
      datev_document_id: datevResult.documentId || null,
      status: uploadStatus,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[UPLOAD] DB insert error:", insertError);
    // DATEV send already succeeded, so we still return success
  }

  return NextResponse.json({
    success: true,
    upload: record || { filename: file.name, document_type: documentType },
    datev_method: datevResult.method,
  });
}

export async function GET() {
  const profile = await getAdminUser();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: uploads, error } = await adminClient
    .from("admin_uploads")
    .select(
      "id, filename, document_type, description, supplier, invoice_number, amount, invoice_date, due_date, created_at, status"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ uploads });
}
