import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  eingangsrechnung: "Eingangsrechnung",
  ausgangsrechnung: "Ausgangsrechnung",
  beleg: "Sonstiger Beleg",
  vertrag: "Vertrag",
  sonstiges: "Sonstiges",
};

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

  // Send email to DATEV via invoices@
  const typeLabel = DOCUMENT_TYPE_LABELS[documentType] || documentType;
  const subject = `${typeLabel} - ${supplier} - ${description || file.name}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "noreply@interactenglish.de",
      to: "invoices@interactenglish.de",
      subject,
      html: `<p>${typeLabel}: ${supplier} - ${description || file.name}</p>`,
      attachments: [{ filename: file.name, content: fileBuffer }],
    });

    if (emailError) {
      console.error("[UPLOAD] Email error:", emailError);
      return NextResponse.json(
        { error: `Email send failed: ${emailError.message}` },
        { status: 500 }
      );
    }

    console.log("[UPLOAD] Email sent:", emailData?.id);
  } catch (err) {
    console.error("[UPLOAD] Email failed:", err);
    return NextResponse.json(
      { error: "Failed to send email to DATEV" },
      { status: 500 }
    );
  }

  // Save record
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
      sent_at: new Date().toISOString(),
      status: "sent",
    })
    .select()
    .single();

  if (insertError) {
    console.error("[UPLOAD] DB insert error:", insertError);
    // Email was already sent, so we still return success
  }

  return NextResponse.json({
    success: true,
    upload: record || { filename: file.name, document_type: documentType },
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
