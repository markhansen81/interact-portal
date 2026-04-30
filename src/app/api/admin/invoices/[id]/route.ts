import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

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

  // Notify TA
  const ta = invoice.profiles as { id: string; first_name: string; last_name: string; email: string };
  await notify({
    userId: ta.id,
    type: `invoice_${body.status}`,
    title: `Invoice ${body.status}`,
    body: `Your invoice ${invoice.invoice_number} has been ${body.status}.`,
  });

  return NextResponse.json({ success: true });
}
