import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, insuranceOrderConfirmationEmail } from "@/lib/email";
import {
  generateInsuranceInvoicePDF,
  type InsuranceOrderData,
} from "@/lib/insurance-invoice-pdf";
import { sendSlackAlert } from "@/lib/slack";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
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

  // Fetch order
  const adminClient = createAdminClient();
  const { data: order, error: fetchError } = await adminClient
    .from("insurance_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const customerEmail = order.customer_email;
  if (!customerEmail) {
    return NextResponse.json(
      { error: "No customer email on order" },
      { status: 400 }
    );
  }

  // Regenerate PDF if missing
  let pdfUrl = order.invoice_pdf_url;
  let pdfBuffer: Buffer | null = null;

  if (!pdfUrl) {
    const pdfData: InsuranceOrderData = {
      order_number: order.order_number || order.squarespace_order_id,
      order_date: new Date(order.created_at).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      customer_first_name: order.customer_first_name || "",
      customer_last_name: order.customer_last_name || "",
      customer_email: customerEmail,
      product_name: order.product_name || "Insurance",
      quantity: 1,
      unit_price: Number(order.total),
      total: Number(order.total),
      currency: order.currency || "EUR",
      insured_first_name: order.insured_first_name || undefined,
      insured_last_name: order.insured_last_name || undefined,
      school_name: order.school_name || undefined,
      project_date: order.project_date || undefined,
      participation_fee:
        order.participation_fee != null
          ? String(order.participation_fee)
          : undefined,
      num_project_days:
        order.num_project_days != null
          ? String(order.num_project_days)
          : undefined,
    };

    pdfBuffer = generateInsuranceInvoicePDF(pdfData);

    // Upload
    const dateStr = new Date(order.created_at)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const surname = (
      order.insured_last_name ||
      order.customer_last_name ||
      "unknown"
    )
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\-]/g, "");
    const storagePath = `insurance-invoices/${dateStr}_${order.order_number || order.squarespace_order_id}_${surname}.pdf`;

    await adminClient.storage.from("documents").upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    const {
      data: { publicUrl },
    } = adminClient.storage.from("documents").getPublicUrl(storagePath);

    pdfUrl = publicUrl;

    // Update order with PDF URL
    await adminClient
      .from("insurance_orders")
      .update({ invoice_pdf_url: publicUrl })
      .eq("id", id);
  } else {
    // Download existing PDF for attachment
    try {
      const res = await fetch(pdfUrl);
      if (res.ok) {
        pdfBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // If we can't download, regenerate
      const pdfData: InsuranceOrderData = {
        order_number: order.order_number || order.squarespace_order_id,
        order_date: new Date(order.created_at).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        customer_first_name: order.customer_first_name || "",
        customer_last_name: order.customer_last_name || "",
        customer_email: customerEmail,
        product_name: order.product_name || "Insurance",
        quantity: 1,
        unit_price: Number(order.total),
        total: Number(order.total),
        currency: order.currency || "EUR",
        insured_first_name: order.insured_first_name || undefined,
        insured_last_name: order.insured_last_name || undefined,
        school_name: order.school_name || undefined,
        project_date: order.project_date || undefined,
        participation_fee:
          order.participation_fee != null
            ? String(order.participation_fee)
            : undefined,
        num_project_days:
          order.num_project_days != null
            ? String(order.num_project_days)
            : undefined,
      };
      pdfBuffer = generateInsuranceInvoicePDF(pdfData);
    }
  }

  // Send email
  const orderNumber = order.order_number || order.squarespace_order_id;
  const currencySymbol = (order.currency || "EUR") === "EUR" ? "\u20AC" : order.currency;
  const parentName =
    `${order.customer_first_name || ""} ${order.customer_last_name || ""}`.trim() ||
    "Kunde";
  const insuredName =
    [order.insured_first_name, order.insured_last_name]
      .filter(Boolean)
      .join(" ") || "Ihr Kind";
  const school = order.school_name || "";

  const emailData = insuranceOrderConfirmationEmail(
    parentName,
    String(orderNumber),
    order.product_name || "Insurance",
    `${currencySymbol}${Number(order.total).toFixed(2)}`,
    insuredName,
    school
  );

  const dateStr = new Date(order.created_at)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const surname = (
    order.insured_last_name ||
    order.customer_last_name ||
    "unknown"
  )
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\-]/g, "");

  const attachments: Array<{ filename: string; content: Buffer }> = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `${dateStr}_${orderNumber}_${surname}.pdf`,
      content: pdfBuffer,
    });
  }

  const result = await sendEmail({
    to: customerEmail,
    subject: emailData.subject,
    html: emailData.html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Email sending failed" },
      { status: 500 }
    );
  }

  // Update email_sent_at
  await adminClient
    .from("insurance_orders")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", id);

  // Slack notification
  await sendSlackAlert({
    type: "success",
    title: "Insurance Order Resent",
    message: `Order #${orderNumber} resent to ${customerEmail}`,
  });

  return NextResponse.json({ ok: true });
}
