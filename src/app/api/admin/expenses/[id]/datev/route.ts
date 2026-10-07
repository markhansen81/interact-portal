import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToDATEV } from "@/lib/datev";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify admin auth
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

  const adminClient = createAdminClient();

  // Fetch the expense claim with profile data
  const { data: claim, error: fetchError } = await adminClient
    .from("expense_claims")
    .select("*, profiles!expense_claims_ta_id_fkey(id, first_name, last_name, email)")
    .eq("id", id)
    .single();

  if (fetchError || !claim) {
    return NextResponse.json(
      { error: fetchError?.message || "Expense claim not found" },
      { status: 404 }
    );
  }

  if (!claim.pdf_url) {
    return NextResponse.json(
      { error: "No PDF available for this expense claim" },
      { status: 400 }
    );
  }

  // Download the PDF
  const pdfRes = await fetch(claim.pdf_url);
  if (!pdfRes.ok) {
    return NextResponse.json(
      { error: "Failed to download PDF" },
      { status: 500 }
    );
  }
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const ta = claim.profiles as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;
  const belegNumber = claim.beleg_number || `EXP-${id.slice(0, 8).toUpperCase()}`;

  // Send to DATEV
  const result = await sendToDATEV({
    pdf: pdfBuffer,
    filename: `${belegNumber}.pdf`,
    belegNumber,
    taName,
    type: "expense",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: `DATEV send failed: ${result.error}` },
      { status: 500 }
    );
  }

  // Update the claim
  const { error: updateError } = await adminClient
    .from("expense_claims")
    .update({
      needs_review: false,
      datev_sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
