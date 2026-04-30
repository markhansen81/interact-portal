import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Generate invoice number: INV-YYYY-XXXX
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", user.id);

  const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`;

  // Create invoice
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      ta_id: user.id,
      work_order_id: body.work_order_id,
      invoice_number: invoiceNumber,
      base_amount: body.base_amount,
      addons_total: body.addons_total,
      total: body.total,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      notes: body.notes || null,
      source: body.source || "calculator",
      uploaded_pdf_url: body.uploaded_pdf_url || null,
      ai_check_result: body.ai_check_result || null,
      ai_check_passed: body.ai_check_passed ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Create invoice addon line items
  if (body.addons && body.addons.length > 0) {
    const addonRows = body.addons.map(
      (addon: { service_id: string; name: string; fee: number; quantity: number; total: number }) => ({
        invoice_id: invoice.id,
        service_id: addon.service_id || null,
        name: addon.name,
        fee_snapshot: addon.fee,
        quantity: addon.quantity,
        total: addon.total,
      })
    );

    await supabase.from("invoice_addons").insert(addonRows);
  }

  // Push to Monday immediately on submission
  if (process.env.MONDAY_API_TOKEN) {
    try {
      const adminClient = createAdminClient();

      // Get TA profile
      const { data: ta } = await adminClient
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      // Get work order program type
      let programType = null;
      if (body.work_order_id) {
        const { data: wo } = await adminClient
          .from("work_orders")
          .select("program_type")
          .eq("id", body.work_order_id)
          .single();
        programType = wo?.program_type || null;
      }

      const taName = ta
        ? `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email
        : "Unknown TA";

      const { pushInvoiceToMonday } = await import("@/lib/monday");
      await pushInvoiceToMonday({
        invoiceNumber,
        taName,
        taEmail: ta?.email || "",
        amount: Number(body.total),
        workOrderId: body.work_order_id,
        pdfUrl: body.uploaded_pdf_url || null,
        programType,
        aiIssues: body.ai_check_result?.issues || null,
      });
    } catch (e) {
      console.error("[MONDAY] Failed to push invoice:", e);
    }
  }

  return NextResponse.json({ success: true, invoice });
}
