import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // TODO: AI validation check
  // TODO: Send notification to admin

  return NextResponse.json({ success: true, invoice });
}
