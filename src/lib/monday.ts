const MONDAY_API_URL = "https://api.monday.com/v2";

export async function mondayQuery(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();
  return data;
}

export interface MondayJobItem {
  id: string;
  name: string;
  column_values: {
    id: string;
    text: string;
    value: string | null;
  }[];
}

export function extractColumnValue(item: MondayJobItem, columnId: string): string {
  const col = item.column_values.find((c) => c.id === columnId);
  return col?.text || "";
}

export function extractTimelineValue(item: MondayJobItem, columnId: string): { start: string; end: string } | null {
  const col = item.column_values.find((c) => c.id === columnId);
  if (!col?.value) return null;
  try {
    const parsed = JSON.parse(col.value);
    return { start: parsed.from, end: parsed.to };
  } catch {
    return null;
  }
}

export function parseTAsNeeded(staffStatus: string): number {
  const match = staffStatus.match(/(\d+)\s*TA/i);
  if (match) return parseInt(match[1]);
  if (staffStatus.toLowerCase().includes("staffed")) return 0;
  return 1;
}

export function mapMondayItemToJob(item: MondayJobItem) {
  const timeline = extractTimelineValue(item, "date__1");
  const staffStatus = extractColumnValue(item, "status__1");
  const tasNeeded = parseTAsNeeded(staffStatus);

  return {
    monday_item_id: item.id,
    title: item.name,
    school: item.name,
    school_address: extractColumnValue(item, "text_3__1"),
    school_state: extractColumnValue(item, "text_4__1"),
    location: extractColumnValue(item, "text_4__1"),
    start_date: timeline?.start || null,
    end_date: timeline?.end || null,
    days: parseInt(extractColumnValue(item, "text7__1")) || null,
    program_type: extractColumnValue(item, "text9__1"),
    grade: extractColumnValue(item, "text0__1"),
    accommodation: extractColumnValue(item, "text32__1"),
    special_conditions: extractColumnValue(item, "long_text__1"),
    co_taught: extractColumnValue(item, "text6__1").toLowerCase().includes("co taught"),
    tas_needed: tasNeeded,
    status: tasNeeded > 0 ? "open" : "assigned",
  };
}

// Push approved invoice to Monday as a subitem on the job
export async function pushInvoiceToMonday({
  invoiceNumber,
  taName,
  taEmail,
  amount,
  workOrderId,
  pdfUrl,
  programType,
  aiIssues,
}: {
  invoiceNumber: string;
  taName: string;
  taEmail: string;
  amount: number;
  workOrderId: string | null;
  pdfUrl: string | null;
  programType: string | null;
  aiIssues: string[] | null;
}) {
  if (!workOrderId) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  // Get the job's Monday item ID and program type via work order
  const { data: wo } = await adminClient
    .from("work_orders")
    .select("job_id, program_type, jobs(monday_item_id)")
    .eq("id", workOrderId)
    .single();

  const jobs = wo?.jobs as unknown as { monday_item_id: string } | null;
  const mondayItemId = jobs?.monday_item_id;
  if (!mondayItemId) return;

  const isCamp = (programType || wo?.program_type || "").toLowerCase().includes("camp");

  // Build subitem name with flags
  let itemName = `${invoiceNumber} — ${taName} — €${amount.toFixed(2)}`;
  if (isCamp) itemName = `[CAMP] ${itemName}`;
  if (aiIssues && aiIssues.length > 0) itemName = `⚠️ ${itemName}`;

  // Create subitem
  const result = await mondayQuery(`
    mutation ($parentId: ID!, $itemName: String!) {
      create_subitem(parent_item_id: $parentId, item_name: $itemName) {
        id
      }
    }
  `, {
    parentId: mondayItemId,
    itemName,
  });

  const subitemId = result?.data?.create_subitem?.id;
  if (!subitemId) return;

  // Add update/note to the subitem with details
  const notes = [
    `**TA:** ${taName} (${taEmail})`,
    `**Invoice:** ${invoiceNumber}`,
    `**Amount:** €${amount.toFixed(2)}`,
    `**Type:** ${isCamp ? "CAMP" : "PROJECT"} — ${programType || wo?.program_type || "Unknown"}`,
    pdfUrl ? `**PDF:** ${pdfUrl}` : null,
    aiIssues && aiIssues.length > 0
      ? `\n**⚠️ AI Checker Flags:**\n${aiIssues.map((i) => `• ${i}`).join("\n")}`
      : "**✅ AI Check:** Passed",
  ]
    .filter(Boolean)
    .join("\n");

  await mondayQuery(`
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
      }
    }
  `, {
    itemId: subitemId,
    body: notes,
  });

  // TODO: Set person column based on camp vs project
  // Camp invoices → assign to camp manager
  // Project invoices → assign to project manager
}
