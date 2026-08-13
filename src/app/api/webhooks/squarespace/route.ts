import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, insuranceOrderConfirmationEmail } from "@/lib/email";
import {
  generateInsuranceInvoicePDF,
  type InsuranceOrderData,
} from "@/lib/insurance-invoice-pdf";

// Map German form field labels to database columns
const FIELD_MAP: Record<string, string> = {
  "Vorname der versicherten Person": "insured_first_name",
  "Nachname der versicherten Person": "insured_last_name",
  Schulname: "school_name",
  "Datum des Projekts": "project_date",
  "Teilnahmegebühr": "participation_fee",
  "Teilnahmegebuehr": "participation_fee",
  "Anzahl der Projekttage": "num_project_days",
  AGB: "agb_accepted",
  "Personenbezogene Daten": "data_privacy_accepted",
};

function verifySignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.SQUARESPACE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[SQUARESPACE] No webhook secret configured, skipping verification");
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

function extractFormFields(
  lineItems: Array<{
    customizations?: Array<{ label?: string; value?: string }>;
  }>
): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean> = {};

  for (const item of lineItems) {
    if (!item.customizations) continue;
    for (const field of item.customizations) {
      const label = field.label?.replace(/:+$/, "").trim();
      if (!label || !field.value) continue;

      const dbColumn = FIELD_MAP[label];
      if (!dbColumn) continue;

      if (dbColumn === "agb_accepted" || dbColumn === "data_privacy_accepted") {
        fields[dbColumn] = true;
      } else if (dbColumn === "participation_fee" || dbColumn === "num_project_days") {
        const num = Number(field.value);
        fields[dbColumn] = isNaN(num) ? field.value : num;
      } else {
        fields[dbColumn] = field.value;
      }
    }
  }

  return fields;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Squarespace-Signature");

  // Verify webhook signature
  if (!verifySignature(rawBody, signature)) {
    console.error("[SQUARESPACE] Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Squarespace sends the order data directly or wrapped
  const order = body.data || body;

  if (!order.id) {
    return NextResponse.json({ error: "No order ID" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Idempotency check
  const { data: existing } = await adminClient
    .from("insurance_orders")
    .select("id")
    .eq("squarespace_order_id", order.id)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already processed" });
  }

  // Extract data
  const customerEmail = order.customerEmail || order.billingAddress?.email || "";
  const firstName = order.billingAddress?.firstName || "";
  const lastName = order.billingAddress?.lastName || "";
  const orderNumber = order.orderNumber || order.id;
  const lineItems = order.lineItems || [];
  const productName = lineItems[0]?.productName || lineItems[0]?.name || "Insurance";
  const quantity = lineItems[0]?.quantity || 1;
  const unitPrice = lineItems[0]?.unitPricePaid?.value
    ? Number(lineItems[0].unitPricePaid.value) / 100
    : 0;
  const grandTotal = order.grandTotal?.value
    ? Number(order.grandTotal.value) / 100
    : 0;
  const currency = order.grandTotal?.currency || "EUR";

  const formFields = extractFormFields(lineItems);

  // Format order date
  const orderDate = order.createdOn
    ? new Date(order.createdOn).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  // Generate PDF
  const pdfData: InsuranceOrderData = {
    order_number: String(orderNumber),
    order_date: orderDate,
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_email: customerEmail,
    billing_address: order.billingAddress
      ? {
          line1: [order.billingAddress.address1, order.billingAddress.address2]
            .filter(Boolean)
            .join(", "),
          city: order.billingAddress.city,
          postalCode: order.billingAddress.postalCode,
          country: order.billingAddress.countryCode,
        }
      : undefined,
    product_name: productName,
    quantity,
    unit_price: unitPrice,
    total: grandTotal,
    currency,
    insured_first_name: formFields.insured_first_name as string | undefined,
    insured_last_name: formFields.insured_last_name as string | undefined,
    school_name: formFields.school_name as string | undefined,
    project_date: formFields.project_date as string | undefined,
    participation_fee: formFields.participation_fee !== undefined
      ? String(formFields.participation_fee)
      : undefined,
    num_project_days: formFields.num_project_days !== undefined
      ? String(formFields.num_project_days)
      : undefined,
  };

  const pdfBuffer = generateInsuranceInvoicePDF(pdfData);

  // Upload PDF to Supabase Storage
  const storagePath = `insurance-invoices/${order.id}.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[SQUARESPACE] PDF upload failed:", uploadError);
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("documents").getPublicUrl(storagePath);

  // Insert order record
  const { error: insertError } = await adminClient
    .from("insurance_orders")
    .insert({
      squarespace_order_id: order.id,
      order_number: String(orderNumber),
      customer_email: customerEmail,
      customer_first_name: firstName,
      customer_last_name: lastName,
      product_name: productName,
      total: grandTotal,
      currency,
      invoice_pdf_url: publicUrl,
      raw_payload: body,
      ...formFields,
    });

  if (insertError) {
    console.error("[SQUARESPACE] Insert failed:", insertError);
    return NextResponse.json(
      { error: "Failed to save order" },
      { status: 500 }
    );
  }

  // Email invoice to customer
  if (customerEmail) {
    const currencySymbol = currency === "EUR" ? "\u20AC" : currency;
    const emailData = insuranceOrderConfirmationEmail(
      `${firstName} ${lastName}`.trim() || "Customer",
      String(orderNumber),
      productName,
      `${currencySymbol}${grandTotal.toFixed(2)}`
    );

    await sendEmail({
      to: customerEmail,
      subject: emailData.subject,
      html: emailData.html,
      attachments: [
        {
          filename: `Invoice-${orderNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    // Update email_sent_at
    await adminClient
      .from("insurance_orders")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("squarespace_order_id", order.id);
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    order_number: orderNumber,
  });
}
