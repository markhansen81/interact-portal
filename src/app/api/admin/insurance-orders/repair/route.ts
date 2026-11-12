import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, insuranceOrderConfirmationEmail } from "@/lib/email";
import {
  generateInsuranceInvoicePDF,
  type InsuranceOrderData,
} from "@/lib/insurance-invoice-pdf";
import { getSecureUrl } from "@/lib/storage";
import { sendSlackAlert } from "@/lib/slack";

// POST /api/admin/insurance-orders/repair
// Finds all orders with participation_fee = 12900 (parsing bug),
// corrects to 129, regenerates PDF, re-uploads, resends email.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  // Find all orders where the fee was corrupted by the German decimal bug
  const { data: orders, error } = await adminClient
    .from("insurance_orders")
    .select("*")
    .eq("participation_fee", 12900);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders || orders.length === 0) {
    return NextResponse.json({ ok: true, repaired: 0, message: "No affected orders found" });
  }

  const results: Array<{ id: string; order_number: string; email: string; status: string; error?: string }> = [];

  for (const order of orders) {
    try {
      // 1. Regenerate PDF with corrected data
      // NOTE: fee DB update happens LAST so a mid-flight failure leaves the order
      // still matchable by participation_fee=12900 on the next repair run.
      const orderDate = new Date(order.created_at).toLocaleDateString("en-GB", {
        year: "numeric", month: "long", day: "numeric",
      });
      const pdfData: InsuranceOrderData = {
        order_number: order.order_number || order.squarespace_order_id,
        order_date: orderDate,
        customer_first_name: order.customer_first_name || "",
        customer_last_name: order.customer_last_name || "",
        customer_email: order.customer_email || "",
        product_name: order.product_name || "Insurance",
        quantity: 1,
        unit_price: Number(order.total),
        total: Number(order.total),
        currency: order.currency || "EUR",
        insured_first_name: order.insured_first_name || undefined,
        insured_last_name: order.insured_last_name || undefined,
        school_name: order.school_name || undefined,
        project_date: order.project_date || undefined,
        participation_fee: "129",  // corrected
        num_project_days: order.num_project_days != null ? String(order.num_project_days) : undefined,
      };
      const pdfBuffer = generateInsuranceInvoicePDF(pdfData);

      // 3. Re-upload PDF
      const dateStr = new Date(order.created_at).toISOString().slice(0, 10).replace(/-/g, "");
      const surname = (order.insured_last_name || order.customer_last_name || "unknown")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9äöüÄÖÜß\-]/g, "");
      const orderNum = order.order_number || order.squarespace_order_id;
      const storagePath = `insurance-invoices/${dateStr}_${orderNum}_${surname}.pdf`;

      const { error: uploadError } = await adminClient.storage.from("documents").upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`);

      const newPdfUrl = await getSecureUrl("documents", storagePath);

      // 4. Update invoice_pdf_url
      const { error: urlError } = await adminClient
        .from("insurance_orders")
        .update({ invoice_pdf_url: newPdfUrl })
        .eq("id", order.id);
      if (urlError) throw new Error(`DB update url: ${urlError.message}`);

      // 5. Send correction email — skipped if already delivered in a prior attempt
      // (repair_email_sent_at is set before fee update, so a failed fee update
      //  leaves the order retryable but won't re-send the email)
      if (order.customer_email && !order.repair_email_sent_at) {
        const currencySymbol = (order.currency || "EUR") === "EUR" ? "€" : order.currency;
        const parentName = `${order.customer_first_name || ""} ${order.customer_last_name || ""}`.trim() || "Kunde";
        const insuredName = [order.insured_first_name, order.insured_last_name].filter(Boolean).join(" ") || "Ihr Kind";

        const emailData = insuranceOrderConfirmationEmail(
          parentName,
          String(orderNum),
          order.product_name || "Insurance",
          `${currencySymbol}${Number(order.total).toFixed(2)}`,
          insuredName,
          order.school_name || ""
        );

        const sent = await sendEmail({
          to: order.customer_email,
          subject: `[Korrektur] ${emailData.subject}`,
          html: emailData.html,
          attachments: [{ filename: `${dateStr}_${orderNum}_${surname}.pdf`, content: pdfBuffer }],
        });
        if (!sent.ok) throw new Error(`Email delivery failed: ${JSON.stringify(sent.error)}`);

        // Persist delivery state before the final fee update so a retry skips re-sending
        const { error: repairEmailError } = await adminClient
          .from("insurance_orders")
          .update({ repair_email_sent_at: new Date().toISOString() })
          .eq("id", order.id);
        if (repairEmailError) throw new Error(`DB update repair_email_sent_at: ${repairEmailError.message}`);
      }

      // Final step: mark the fee as corrected — only reached if everything above succeeded
      const { error: feeError } = await adminClient
        .from("insurance_orders")
        .update({ participation_fee: 129 })
        .eq("id", order.id);
      if (feeError) throw new Error(`DB update fee: ${feeError.message}`);

      results.push({ id: order.id, order_number: String(orderNum), email: order.customer_email || "-", status: "repaired" });
    } catch (err) {
      results.push({ id: order.id, order_number: String(order.order_number), email: order.customer_email || "-", status: "failed", error: String(err) });
    }
  }

  await sendSlackAlert({
    type: "success",
    title: "Insurance Order Repair Complete",
    message: `Fixed ${results.filter(r => r.status === "repaired").length}/${orders.length} orders with wrong participation fee (€12900 → €129). Corrected PDFs resent to customers.`,
  });

  return NextResponse.json({ ok: true, repaired: results.filter(r => r.status === "repaired").length, results });
}
