import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

export async function PATCH(
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const adminClient = createAdminClient();

  const updates: Record<string, unknown> = { status: body.status };

  if (body.status === "approved") {
    updates.approved_at = new Date().toISOString();
  } else if (body.status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { data: invoice, error } = await adminClient
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select("*, profiles!invoices_ta_id_fkey(id, first_name, last_name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ta = invoice.profiles as { id: string; first_name: string; last_name: string; email: string };
  const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;

  // Notify TA of status change
  await notify({
    userId: ta.id,
    type: `invoice_${body.status}`,
    title: `Invoice ${body.status}`,
    body: `Your invoice ${invoice.invoice_number} has been ${body.status}.`,
    email: {
      to: ta.email,
      subject: `Invoice ${invoice.invoice_number} — ${body.status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #18181b;">Invoice ${body.status === "paid" ? "Paid" : body.status === "approved" ? "Approved" : "Updated"}</h2>
          <p>Hi ${taName},</p>
          <p>Your invoice <strong>${invoice.invoice_number}</strong> for <strong>€${Number(invoice.total).toFixed(2)}</strong> has been <strong>${body.status}</strong>.</p>
          ${body.status === "paid" ? "<p>Payment has been processed. Please allow 1-3 business days for the funds to arrive.</p>" : ""}
          ${body.status === "approved" ? "<p>Your invoice has been approved and will be processed for payment shortly.</p>" : ""}
          <p><a href=\"${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/portal/invoices\" style=\"display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;\">View Invoice</a></p>
          <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
        </div>
      `,
    },
  });

  // Forward to DATEV when approved
  if (body.status === "approved" && process.env.DATEV_UPLOAD_EMAIL) {
    await sendEmail({
      to: process.env.DATEV_UPLOAD_EMAIL,
      subject: `Invoice ${invoice.invoice_number} — ${taName} — €${Number(invoice.total).toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h3>Invoice for Processing</h3>
          <p><strong>TA:</strong> ${taName} (${ta.email})</p>
          <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount:</strong> €${Number(invoice.total).toFixed(2)}</p>
          <p><strong>Approved:</strong> ${new Date().toLocaleDateString("de-DE")}</p>
          ${invoice.uploaded_pdf_url ? `<p><strong>PDF:</strong> <a href="${invoice.uploaded_pdf_url}">Download</a></p>` : ""}
        </div>
      `,
    });
  }

  return NextResponse.json({ success: true });
}
