import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, schoolInvoiceEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; invoiceId: string }> }
) {
  const { token, invoiceId } = await params;

  const adminClient = createAdminClient();

  // Verify token
  const { data: project } = await adminClient
    .from("projects")
    .select("id, school")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await adminClient
    .from("school_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("project_id", project.id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Only allow sending if invoice is sent (visible to school)
  if (invoice.status === "draft") {
    return NextResponse.json(
      { error: "Invoice not yet available" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const sendTo = body.email;

  if (!sendTo) {
    return NextResponse.json(
      { error: "Email address required" },
      { status: 400 }
    );
  }

  // Fetch PDF
  let pdfBuffer: Buffer;
  try {
    const pdfRes = await fetch(invoice.pdf_url);
    if (!pdfRes.ok) throw new Error("Failed to fetch PDF");
    const arrayBuffer = await pdfRes.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[SCHOOL-INVOICE] Failed to fetch PDF:", err);
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 }
    );
  }

  const totalFormatted = formatMoney(invoice.total);
  const dueDateFormatted = formatDateDE(invoice.due_date);

  const emailTemplate = schoolInvoiceEmail(
    invoice.invoice_number,
    project.school || "School",
    totalFormatted,
    dueDateFormatted
  );

  const result = await sendEmail({
    to: sendTo,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    attachments: [
      {
        filename: `${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

function formatDateDE(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function formatMoney(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart} EUR`;
}
