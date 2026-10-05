import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, schoolInvoiceEmail } from "@/lib/email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  const { invoiceId } = await params;

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

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.paid_at) updates.paid_at = body.paid_at;
  if (body.sent_to) updates.sent_to = body.sent_to;

  if (body.status === "paid" && !body.paid_at) {
    updates.paid_at = new Date().toISOString();
  }

  const adminClient = createAdminClient();
  const { data: invoice, error } = await adminClient
    .from("school_invoices")
    .update(updates)
    .eq("id", invoiceId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  const { invoiceId } = await params;

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

  const body = await request.json();
  if (body.action !== "send") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Fetch invoice
  const { data: invoice, error: invoiceError } = await adminClient
    .from("school_invoices")
    .select("*, projects(school)")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const sendTo = body.sent_to || invoice.sent_to;
  if (!sendTo) {
    return NextResponse.json(
      { error: "No recipient email specified" },
      { status: 400 }
    );
  }

  // Fetch PDF from url
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

  const schoolName =
    (invoice.projects as { school: string } | null)?.school || "School";
  const totalFormatted = formatMoney(invoice.total);
  const dueDateFormatted = formatDateDE(invoice.due_date);

  const emailTemplate = schoolInvoiceEmail(
    invoice.invoice_number,
    schoolName,
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

  // Update invoice
  await adminClient
    .from("school_invoices")
    .update({
      sent_at: new Date().toISOString(),
      sent_to: sendTo,
      status: "sent",
    })
    .eq("id", invoiceId);

  return NextResponse.json({ ok: true });
}

function formatDateDE(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  // Handle ISO date
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function formatMoney(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart} EUR`;
}
