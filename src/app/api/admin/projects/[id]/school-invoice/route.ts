import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSchoolInvoicePDF } from "@/lib/school-invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: invoices, error } = await adminClient
    .from("school_invoices")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: invoices || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Get the project
  const { data: project, error: projectError } = await adminClient
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const numStudents = body.num_students || 0;
  const pricePP = body.price_pp || project.price_pp || 0;
  const contactPerson = body.contact_person || "Justin Beard";
  const sentTo = body.sent_to || null;
  const invoiceType = body.invoice_type || "full";
  const depositAmount = body.deposit_amount || null;
  const totalOverride = body.total_override || null;

  if (!numStudents || !pricePP) {
    return NextResponse.json(
      { error: "num_students and price_pp are required" },
      { status: 400 }
    );
  }

  const subtotal = numStudents * pricePP;
  const total = totalOverride || subtotal;

  // Get next invoice number from sequence
  const { data: seqResult, error: seqError } = await adminClient.rpc(
    "nextval_school_invoice_seq"
  );

  let invoiceNumber: string;
  if (seqError || !seqResult) {
    // Fallback: use raw SQL via a simple query
    const { data: rawSeq } = await adminClient
      .from("school_invoices")
      .select("invoice_number")
      .order("created_at", { ascending: false })
      .limit(1);
    const lastNum = rawSeq?.[0]?.invoice_number
      ? parseInt(rawSeq[0].invoice_number.replace("RE-", ""))
      : 3326;
    invoiceNumber = String(lastNum + 1);
  } else {
    invoiceNumber = String(seqResult);
  }

  const invoiceDate = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const createdByName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : "InterACT English";

  // Build customer number from monday_item_id or project id
  const customerNumber = project.monday_item_id
    ? `M-${project.monday_item_id}`
    : `P-${id.slice(0, 8)}`;

  // Parse address parts
  const schoolAddress = project.school_address || "";

  // Build program description
  const typePrefix = invoiceType === "deposit" ? "Anzahlung — " : invoiceType === "final" ? "Restzahlung — " : "";
  const programDescription = `${typePrefix}${project.program_type || "English Project"} ${project.school || ""}, ${
    project.start_date
      ? `${formatDateDE(project.start_date)} - ${formatDateDE(project.end_date || project.start_date)}`
      : ""
  }`.trim();

  // Generate PDF
  const pdfBuffer = await generateSchoolInvoicePDF({
    invoiceNumber,
    invoiceDate,
    school: project.school || "School",
    schoolAddress,
    customerNumber,
    contactPerson,
    programType: project.program_type || "English Project",
    programDescription,
    serviceStart: project.start_date || invoiceDate,
    serviceEnd: project.end_date || project.start_date || invoiceDate,
    numStudents,
    pricePP,
    total,
    dueDate,
    createdByName,
  });

  // Upload PDF to Supabase storage
  const fileName = `school-invoices/RE-${invoiceNumber}.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[SCHOOL-INVOICE] Upload error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("documents").getPublicUrl(fileName);

  // Create invoice record
  const { data: invoice, error: insertError } = await adminClient
    .from("school_invoices")
    .insert({
      project_id: id,
      invoice_number: `RE-${invoiceNumber}`,
      invoice_date: invoiceDate,
      due_date: dueDate,
      num_students: numStudents,
      price_pp: pricePP,
      subtotal,
      total,
      invoice_type: invoiceType,
      deposit_amount: depositAmount,
      status: "draft",
      pdf_url: publicUrl,
      contact_person: contactPerson,
      sent_to: sentTo,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[SCHOOL-INVOICE] Insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create invoice record" },
      { status: 500 }
    );
  }

  return NextResponse.json({ invoice });
}

function formatDateDE(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}
