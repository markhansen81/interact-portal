import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateExpensePDF } from "@/lib/expense-pdf";
import { sendToDATEV } from "@/lib/datev";
import { sendSlackAlert } from "@/lib/slack";
import { getSecureUrl } from "@/lib/storage";

interface ExpenseItem {
  description: string;
  amount: number;
  category: string;
  receipt_url: string | null;
  work_order_id: string | null;
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

  // Input validation
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "At least one expense item is required" }, { status: 400 });
  }
  if (body.items.length > 50) {
    return NextResponse.json({ error: "Too many items (max 50)" }, { status: 400 });
  }
  for (const item of body.items as ExpenseItem[]) {
    if (typeof item.amount !== "number" || item.amount <= 0) {
      return NextResponse.json({ error: "Each item must have a positive amount" }, { status: 400 });
    }
    if (item.amount > 10_000) {
      return NextResponse.json({ error: "Item amount exceeds maximum (10,000)" }, { status: 400 });
    }
    if (!item.description || typeof item.description !== "string" || item.description.trim().length === 0) {
      return NextResponse.json({ error: "Each item must have a description" }, { status: 400 });
    }
    if (item.description.length > 500) {
      return NextResponse.json({ error: "Item description too long (max 500 characters)" }, { status: 400 });
    }
    if (!item.category || typeof item.category !== "string") {
      return NextResponse.json({ error: "Each item must have a category" }, { status: 400 });
    }
  }
  if (typeof body.total !== "number" || body.total <= 0) {
    return NextResponse.json({ error: "Total must be a positive number" }, { status: 400 });
  }

  // Create expense claim (work_order_id is now optional at claim level)
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

  // Create line items (include work_order_id per item if column exists)
  if (body.items && body.items.length > 0) {
    const itemRows = body.items.map((item: ExpenseItem) => ({
      claim_id: claim.id,
      description: item.description,
      amount: item.amount,
      category: item.category,
      receipt_url: item.receipt_url,
      work_order_id: item.work_order_id || null,
    }));

    const { error: itemsError } = await supabase.from("expense_items").insert(itemRows);

    // If work_order_id column doesn't exist yet, retry without it
    if (itemsError?.message?.includes("work_order_id")) {
      const fallbackRows = body.items.map((item: ExpenseItem) => ({
        claim_id: claim.id,
        description: item.description,
        amount: item.amount,
        category: item.category,
        receipt_url: item.receipt_url,
      }));
      await supabase.from("expense_items").insert(fallbackRows);
    }
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

  // 2. Fetch work orders for all items that reference a project
  const woIds = [
    ...new Set(
      (body.items as ExpenseItem[])
        .map((item) => item.work_order_id)
        .filter(Boolean)
    ),
  ];

  const woNameMap: Record<string, string> = {};
  if (woIds.length > 0) {
    const { data: workOrders } = await adminClient
      .from("work_orders")
      .select("id, project_name")
      .in("id", woIds);

    if (workOrders) {
      for (const wo of workOrders) {
        woNameMap[wo.id] = wo.project_name;
      }
    }
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
    items: body.items.map((item: { description: string; amount: number; category: string; receipt_url?: string; work_order_id?: string }) => ({
      description: item.description,
      amount: item.amount,
      category: item.category,
      receipt_url: item.receipt_url || null,
      projectName: item.work_order_id ? (woNameMap[item.work_order_id] || "Allgemein") : "Allgemein",
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

  // 6. Get secure signed URL instead of permanent public URL (PDFs contain IBAN/tax data)
  const secureUrl = await getSecureUrl("documents", storagePath);

  await supabase
    .from("expense_claims")
    .update({ pdf_url: secureUrl, beleg_number: belegNumber })
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

    await sendSlackAlert({
      type: "warning",
      title: "Expense flagged for review",
      message: `Expense ${belegNumber} from ${profile.first_name} ${profile.last_name} has item(s) over EUR100`,
      fields: [
        { label: "Total", value: `EUR${Number(body.total).toFixed(2)}` },
        { label: "TA", value: `${profile.first_name} ${profile.last_name}` },
      ],
    }).catch(() => {});
  } else {
    // Auto-send to DATEV (API first, email fallback)
    const taName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    const datevResult = await sendToDATEV({
      pdf: pdfBuffer,
      filename: `${belegNumber}.pdf`,
      belegNumber,
      taName,
      type: "expense",
    });

    if (datevResult.ok) {
      const datevUpdate: Record<string, unknown> = {
        datev_sent_at: new Date().toISOString(),
      };
      if (datevResult.documentId) {
        datevUpdate.datev_document_id = datevResult.documentId;
      }
      await supabase
        .from("expense_claims")
        .update(datevUpdate)
        .eq("id", claim.id);
      console.log(`[DATEV] Expense ${belegNumber} sent via ${datevResult.method}`);
    } else {
      console.error(`[DATEV] Failed to send expense ${belegNumber}:`, datevResult.error);
      await sendSlackAlert({
        type: "critical",
        title: `DATEV upload failed for expense ${belegNumber}`,
        message: `Expense from ${profile.first_name} ${profile.last_name} could not be sent to DATEV`,
        fields: [
          { label: "Beleg", value: belegNumber },
          { label: "Error", value: String(datevResult.error || "Unknown") },
        ],
      }).catch(() => {});
    }
  }

  // Re-fetch the updated claim
  const { data: updatedClaim } = await supabase
    .from("expense_claims")
    .select()
    .eq("id", claim.id)
    .single();

  return NextResponse.json({ success: true, claim: updatedClaim });
}
