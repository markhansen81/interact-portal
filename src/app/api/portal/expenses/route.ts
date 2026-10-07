import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateExpensePDF } from "@/lib/expense-pdf";
import { sendToDATEV } from "@/lib/datev";

interface ExpenseItem {
  description: string;
  amount: number;
  category: string;
  receipt_url: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.work_order_id) {
    return NextResponse.json(
      { error: "work_order_id is required" },
      { status: 400 }
    );
  }

  // Create expense claim
  const { data: claim, error } = await supabase
    .from("expense_claims")
    .insert({
      ta_id: user.id,
      work_order_id: body.work_order_id,
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
    const itemRows = body.items.map((item: ExpenseItem) => ({
      claim_id: claim.id,
      description: item.description,
      amount: item.amount,
      category: item.category,
      receipt_url: item.receipt_url,
    }));

    await supabase.from("expense_items").insert(itemRows);
  }

  // --- Post-creation: PDF generation, DATEV routing ---

  // 1. Fetch TA profile
  const { data: profile } = await adminClient
    .from("profiles")
    .select("first_name, last_name, tax_number, iban, bic")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "TA profile not found" },
      { status: 400 }
    );
  }

  // 2. Fetch work order
  const { data: workOrder } = await adminClient
    .from("work_orders")
    .select("project_name")
    .eq("id", body.work_order_id)
    .single();

  if (!workOrder) {
    return NextResponse.json(
      { error: "Work order not found" },
      { status: 400 }
    );
  }

  // 3. Generate beleg_number: AE<DDMMYY><initials>
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const initials = (
    (profile.first_name?.[0] ?? "") +
    (profile.first_name?.[1] ?? "") +
    (profile.last_name?.[0] ?? "")
  ).toUpperCase();
  const belegNumber = `AE${dd}${mm}${yy}${initials}`;

  // 4. Generate Auslagenerstattung PDF
  const pdfBuffer = await generateExpensePDF({
    belegNumber,
    belegDate: new Date().toISOString().slice(0, 10),
    taProfile: {
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      tax_number: profile.tax_number,
      iban: profile.iban,
      bic: profile.bic,
    },
    projectName: workOrder.project_name,
    items: body.items.map((item: { description: string; amount: number; category: string; receipt_url?: string }) => ({
      description: item.description,
      amount: item.amount,
      category: item.category,
    })),
  });

  // 5. Upload PDF to Supabase storage
  const storagePath = `expenses/${claim.id}.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `PDF upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 6. Get public URL and update claim
  const {
    data: { publicUrl },
  } = adminClient.storage.from("documents").getPublicUrl(storagePath);

  await supabase
    .from("expense_claims")
    .update({ pdf_url: publicUrl, beleg_number: belegNumber })
    .eq("id", claim.id);

  // 7. Check if any single item exceeds €100
  const hasHighValueItem = body.items.some(
    (item: ExpenseItem) => item.amount > 100
  );

  if (hasHighValueItem) {
    // Flag for admin review
    await supabase
      .from("expense_claims")
      .update({
        needs_review: true,
        review_reason: "Item over €100",
      })
      .eq("id", claim.id);
  } else {
    // Auto-send to DATEV
    const taName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    await sendToDATEV({
      pdf: pdfBuffer,
      filename: `${belegNumber}.pdf`,
      belegNumber,
      taName,
      type: "expense",
    });

    await supabase
      .from("expense_claims")
      .update({ datev_sent_at: new Date().toISOString() })
      .eq("id", claim.id);
  }

  // Re-fetch the updated claim
  const { data: updatedClaim } = await supabase
    .from("expense_claims")
    .select()
    .eq("id", claim.id)
    .single();

  return NextResponse.json({ success: true, claim: updatedClaim });
}
