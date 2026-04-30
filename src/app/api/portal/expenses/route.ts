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

  // Create expense claim
  const { data: claim, error } = await supabase
    .from("expense_claims")
    .insert({
      ta_id: user.id,
      work_order_id: body.work_order_id || null,
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

  // Create line items
  if (body.items && body.items.length > 0) {
    const itemRows = body.items.map(
      (item: { description: string; amount: number; receipt_url: string | null }) => ({
        claim_id: claim.id,
        description: item.description,
        amount: item.amount,
        receipt_url: item.receipt_url,
      })
    );

    await supabase.from("expense_items").insert(itemRows);
  }

  return NextResponse.json({ success: true, claim });
}
