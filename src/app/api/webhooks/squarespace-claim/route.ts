import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayQuery } from "@/lib/monday";

const INSURANCE_BOARD_ID = "18426362720";
const CLAIMS_GROUP = "group_mm668g88";
const STATUS_COL = "color_mm66j0qt";

export async function POST(request: Request) {
  // Optional bearer token auth
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.SQUARESPACE_WEBHOOK_SECRET;
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract claim data from Zapier (Squarespace form fields)
  const claim = body.data || body;

  const studentFirstName = claim.studentFirstName || claim.insured_first_name || "";
  const studentLastName = claim.studentLastName || claim.insured_last_name || "";
  const parentName = [claim.parentFirstName, claim.parentLastName].filter(Boolean).join(" ")
    || claim.parentName || "";
  const email = claim.email || claim.customerEmail || "";
  const schoolName = claim.schoolName || claim.school_name || "";
  const orderNumber = claim.orderNumber || claim.order_number || "";
  const daysMissed = claim.daysMissed || claim.days_missed || "";
  const reason = claim.reason || "";
  const iban = claim.iban || "";
  const accountHolder = claim.accountHolder || claim.kontoinhaber || "";
  const notes = claim.notes || claim.anmerkungen || "";

  const adminClient = createAdminClient();

  // Save claim to Supabase (add claim fields to insurance_orders)
  if (orderNumber) {
    await adminClient
      .from("insurance_orders")
      .update({
        claim_submitted_at: new Date().toISOString(),
        claim_days_missed: Number(daysMissed) || null,
        claim_reason: reason,
        claim_iban: iban,
        claim_account_holder: accountHolder,
        claim_notes: notes,
        claim_parent_name: parentName,
      })
      .eq("order_number", orderNumber);
  }

  // Find and update Monday item
  try {
    // Search for the item by order number
    const searchResult = await mondayQuery(
      `query ($boardId: [ID!]) {
        boards(ids: $boardId) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values { id text }
            }
          }
        }
      }`,
      { boardId: [INSURANCE_BOARD_ID] }
    );

    const items = searchResult?.data?.boards?.[0]?.items_page?.items || [];
    const studentName = `${studentFirstName} ${studentLastName}`.trim();

    // Match by order number or student name
    const match = items.find((item: { id: string; name: string; column_values: { id: string; text: string }[] }) => {
      const orderCol = item.column_values.find((c: { id: string; text: string }) => c.id === "text_mm66gnmg");
      return (
        (orderNumber && orderCol?.text === String(orderNumber)) ||
        (studentName && item.name.includes(studentName))
      );
    });

    if (match) {
      // Update claim columns + status
      const claimDate = new Date().toISOString().slice(0, 10);
      const columnValues = JSON.stringify({
        [STATUS_COL]: { index: 1 },
        numeric_mm66sev8: String(daysMissed || ""),
        date_mm66zhf2: { date: claimDate },
        text_mm66vg5z: reason,
        text_mm665xah: iban,
        text_mm66aep4: accountHolder,
        text_mm667kg3: notes,
      });

      await mondayQuery(
        `mutation ($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) { id }
        }`,
        {
          itemId: match.id,
          boardId: INSURANCE_BOARD_ID,
          columnValues,
        }
      );

      // Move to Claims group
      await mondayQuery(
        `mutation ($itemId: ID!, $groupId: String!) {
          move_item_to_group(item_id: $itemId, group_id: $groupId) { id }
        }`,
        {
          itemId: match.id,
          groupId: CLAIMS_GROUP,
        }
      );
    }
  } catch (err) {
    console.error("[CLAIM] Monday update failed:", err);
  }

  return NextResponse.json({
    ok: true,
    order_number: orderNumber,
    student: `${studentFirstName} ${studentLastName}`.trim(),
  });
}
