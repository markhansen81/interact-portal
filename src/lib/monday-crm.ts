/**
 * Monday CRM Pipeline Handler
 *
 * Monday is single source of truth for CRM data.
 * Portal syncs from Monday and provides views (Church, resource planning).
 *
 * Flow:
 * 1. Opp created/updated → synced to Supabase → visible on Portal Church
 * 2. Opp stage → Won → creates Project on Monday + syncs to Supabase
 * 3. Project updated → synced to Supabase → Church shows Project data instead of Opp
 * 4. Project → Done → creates Rebook Opp on Monday
 *
 * Church logic:
 * - If item has a Project → show Project data (it's the living record)
 * - If item only has Opp → show Opp data (not yet converted)
 *
 * All actions logged to Supabase `crm_automation_log` for admin visibility.
 */

import { mondayQuery } from "./monday";

// Board IDs
const BOARDS = {
  leads: "6976340556",
  contacts: "6976340559",
  organizations: "6976340560",
  opportunities: "6976340562",
  projects: "6976340557",
};

// Column mappings: Opp → Project (fields to copy when Opp becomes Project)
const OPP_TO_PROJECT_COLS: [string, string][] = [
  ["opp_school_name", "proj_school_name"],
  ["opp_num_students", "proj_num_students"],
  ["opp_num_groups", "proj_num_groups"],
  ["opp_num_days", "proj_num_days"],
  ["opp_num_tas", "proj_num_tas"],
  ["opp_price_pp", "proj_price_pp"],
  ["opp_program_type", "proj_program_type"],
  ["opp_grade_level", "proj_grade_level"],
  ["opp_co_taught", "proj_co_taught"],
  ["opp_accommodation", "proj_accommodation"],
  ["opp_school_year", "proj_school_year"],
  ["opp_email", "proj_email"],
  ["opp_phone", "proj_phone"],
  ["opp_staffing_notes", "proj_staffing_notes"],
  ["opp_tarif", "proj_tarif"],
  ["opp_state", "proj_state"],
  ["opp_street", "proj_street"],
  ["opp_city", "proj_city"],
  ["opp_postcode", "proj_postcode"],
  ["opp_school_type", "proj_school_type"],
];

interface MondayEvent {
  type?: string;
  pulseId?: string;
  itemId?: string;
  boardId?: string;
  columnId?: string;
  columnType?: string;
  value?: { label?: { text?: string }; value?: unknown };
  previousValue?: { label?: { text?: string } };
  pulseName?: string;
}

export interface CRMAction {
  action: string;
  source_board: string;
  source_item: string;
  target_board?: string;
  target_item?: string;
  details: string;
  timestamp: string;
}

// ────────────────────────────────────────────
// MONDAY API HELPERS
// ────────────────────────────────────────────

async function fetchItem(itemId: string) {
  const result = await mondayQuery(
    `query ($ids: [ID!]) {
      items(ids: $ids) {
        id name
        column_values { id text value type }
      }
    }`,
    { ids: [itemId] }
  );
  return result?.data?.items?.[0] || null;
}

function getCol(
  item: { column_values: { id: string; text: string; value: string | null }[] },
  colId: string
): string {
  return item.column_values.find((c: { id: string }) => c.id === colId)?.text || "";
}

function getColValue(
  item: { column_values: { id: string; value: string | null }[] },
  colId: string
): unknown {
  const val = item.column_values.find((c: { id: string }) => c.id === colId)?.value;
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function getConnectedIds(
  item: { column_values: { id: string; value: string | null }[] },
  colId: string
): string[] {
  const val = getColValue(item, colId) as {
    linkedPulseIds?: { linkedPulseId: number }[];
  } | null;
  if (!val?.linkedPulseIds) return [];
  return val.linkedPulseIds.map((p) => String(p.linkedPulseId));
}

async function createItem(
  boardId: string,
  name: string,
  columnValues: Record<string, unknown>,
  groupId?: string
) {
  const result = await mondayQuery(
    `mutation ($boardId: ID!, $name: String!, $cols: JSON!, $group: String) {
      create_item(
        board_id: $boardId, item_name: $name,
        column_values: $cols, group_id: $group,
        create_labels_if_missing: true
      ) { id name }
    }`,
    { boardId, name, cols: JSON.stringify(columnValues), group: groupId || "topics" }
  );
  return result?.data?.create_item || null;
}

async function connectItems(
  boardId: string, itemId: string, relationColId: string, targetIds: string[]
) {
  await mondayQuery(
    `mutation ($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }`,
    { boardId, itemId, cols: JSON.stringify({ [relationColId]: { item_ids: targetIds.map(Number) } }) }
  );
}

async function addUpdate(itemId: string, body: string) {
  await mondayQuery(
    `mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }`,
    { itemId, body }
  );
}

// ────────────────────────────────────────────
// SUPABASE SYNC — Church data lives here
// ────────────────────────────────────────────

/**
 * Sync an Opp to the church_items table in Supabase.
 * This is what the portal reads for the Church view.
 */
export async function syncOppToChurch(
  oppItemId: string,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<void> {
  const opp = await fetchItem(oppItemId);
  if (!opp) return;

  const contactIds = getConnectedIds(opp, "deal_contact");
  const orgIds = getConnectedIds(opp, "deal_org");

  // Parse project start date for KW calculation
  const startDate = getCol(opp, "opp_project_start");
  const endDate = getCol(opp, "opp_project_end");
  let kw: number | null = null;
  let year: number | null = null;
  if (startDate) {
    const d = new Date(startDate);
    year = d.getFullYear();
    // ISO week number
    const jan4 = new Date(d.getFullYear(), 0, 4);
    kw = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  }

  const churchData = {
    monday_opp_id: oppItemId,
    monday_project_id: null as string | null, // no project yet
    monday_contact_ids: contactIds,
    monday_org_ids: orgIds,
    source: "opportunity" as const,
    name: opp.name,
    school_name: getCol(opp, "opp_school_name") || opp.name,
    deal_value: parseFloat(getCol(opp, "deal_value")) || null,
    deal_stage: getCol(opp, "deal_stage"),
    program_type: getCol(opp, "opp_program_type"),
    school_type: getCol(opp, "opp_school_type"),
    grade_level: getCol(opp, "opp_grade_level"),
    num_students: parseInt(getCol(opp, "opp_num_students")) || null,
    num_groups: parseInt(getCol(opp, "opp_num_groups")) || null,
    num_days: parseInt(getCol(opp, "opp_num_days")) || null,
    num_tas: parseInt(getCol(opp, "opp_num_tas")) || null,
    price_pp: parseFloat(getCol(opp, "opp_price_pp")) || null,
    co_taught: getCol(opp, "opp_co_taught"),
    accommodation: getCol(opp, "opp_accommodation"),
    school_year: getCol(opp, "opp_school_year"),
    street: getCol(opp, "opp_street"),
    city: getCol(opp, "opp_city"),
    postcode: getCol(opp, "opp_postcode"),
    state: getCol(opp, "opp_state"),
    contact_email: getCol(opp, "opp_email"),
    contact_phone: getCol(opp, "opp_phone"),
    sales_rep: getCol(opp, "opp_sales_rep"),
    staffing_notes: getCol(opp, "opp_staffing_notes"),
    start_date: startDate || null,
    end_date: endDate || null,
    kw,
    year,
    updated_at: new Date().toISOString(),
  };

  // Upsert by monday_opp_id
  await adminClient
    .from("church_items")
    .upsert(churchData, { onConflict: "monday_opp_id" });
}

/**
 * Sync a Project to the church_items table.
 * Overwrites the Opp data — Project is now the living record.
 */
export async function syncProjectToChurch(
  projectItemId: string,
  oppItemId: string | null,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<void> {
  const project = await fetchItem(projectItemId);
  if (!project) return;

  const contactIds = getConnectedIds(project, "project_contact");
  const orgIds = getConnectedIds(project, "connect_boards");

  // Get timeline for dates
  const timelineVal = getColValue(project, "project_timeline") as {
    from?: string;
    to?: string;
  } | null;
  const startDate = timelineVal?.from || null;
  const endDate = timelineVal?.to || null;
  let kw: number | null = null;
  let year: number | null = null;
  if (startDate) {
    const d = new Date(startDate);
    year = d.getFullYear();
    const jan4 = new Date(d.getFullYear(), 0, 4);
    kw = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  }

  const churchData = {
    monday_opp_id: oppItemId,
    monday_project_id: projectItemId,
    monday_contact_ids: contactIds,
    monday_org_ids: orgIds,
    source: "project" as const, // Now showing project data
    name: project.name,
    school_name: getCol(project, "proj_school_name") || project.name,
    deal_stage: "Won",
    project_status: getCol(project, "project_status"),
    program_type: getCol(project, "proj_program_type"),
    school_type: getCol(project, "proj_school_type"),
    grade_level: getCol(project, "proj_grade_level"),
    num_students: parseInt(getCol(project, "proj_num_students")) || null,
    num_groups: parseInt(getCol(project, "proj_num_groups")) || null,
    num_days: parseInt(getCol(project, "proj_num_days")) || null,
    num_tas: parseInt(getCol(project, "proj_num_tas")) || null,
    price_pp: parseFloat(getCol(project, "proj_price_pp")) || null,
    co_taught: getCol(project, "proj_co_taught"),
    accommodation: getCol(project, "proj_accommodation"),
    school_year: getCol(project, "proj_school_year"),
    street: getCol(project, "proj_street"),
    city: getCol(project, "proj_city"),
    postcode: getCol(project, "proj_postcode"),
    state: getCol(project, "proj_state"),
    contact_email: getCol(project, "proj_email"),
    contact_phone: getCol(project, "proj_phone"),
    staffing_notes: getCol(project, "proj_staffing_notes"),
    feedback: getCol(project, "proj_feedback"),
    invoice_details: getCol(project, "proj_invoice_details"),
    start_date: startDate,
    end_date: endDate,
    kw,
    year,
    updated_at: new Date().toISOString(),
  };

  if (oppItemId) {
    // Update existing church item (was created from Opp, now upgrading to Project)
    await adminClient
      .from("church_items")
      .upsert(churchData, { onConflict: "monday_opp_id" });
  } else {
    // Standalone project (no opp)
    await adminClient
      .from("church_items")
      .insert(churchData);
  }
}

// ────────────────────────────────────────────
// PIPELINE HANDLERS
// ────────────────────────────────────────────

/**
 * Handle: Opp created or updated (any column change)
 * → Sync to Supabase church_items (portal Church view)
 */
export async function handleOppChanged(
  oppItemId: string,
  columnId: string,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  // Sync opp data to church
  await syncOppToChurch(oppItemId, adminClient);

  actions.push({
    action: "opp_synced_to_church",
    source_board: "opportunities",
    source_item: oppItemId,
    details: `Opp column ${columnId} changed → synced to portal Church`,
    timestamp: now,
  });

  return actions;
}

/**
 * Handle: Opp Stage changed to "Won"
 * → Create Project on Monday + sync to Supabase
 */
export async function handleOppWon(
  oppItemId: string,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  const opp = await fetchItem(oppItemId);
  if (!opp) return actions;

  const oppName = opp.name;
  const contactIds = getConnectedIds(opp, "deal_contact");
  const orgIds = getConnectedIds(opp, "deal_org");

  // Build Project column values from Opp
  const projectCols: Record<string, unknown> = {
    project_status: { label: "Working on it" },
  };

  for (const [oppCol, projCol] of OPP_TO_PROJECT_COLS) {
    const text = getCol(opp, oppCol);
    if (!text) continue;

    if (projCol === "project_timeline") {
      const endCol = getCol(opp, "opp_project_end");
      projectCols[projCol] = { from: text.slice(0, 10), to: endCol ? endCol.slice(0, 10) : text.slice(0, 10) };
    } else if (projCol.includes("num_") || projCol.includes("price_") || projCol.includes("min_")) {
      projectCols[projCol] = text;
    } else if (projCol.includes("staffing") || projCol.includes("details") || projCol.includes("feedback")) {
      projectCols[projCol] = { text };
    } else {
      // Try as dropdown label first, fall back to text
      projectCols[projCol] = text;
    }
  }

  // Create the Project on Monday
  const project = await createItem(BOARDS.projects, oppName, projectCols, "new_group29179");
  if (!project) {
    actions.push({ action: "ERROR", source_board: "opportunities", source_item: oppItemId,
      details: `Failed to create project for ${oppName}`, timestamp: now });
    return actions;
  }

  actions.push({
    action: "project_created",
    source_board: "opportunities", source_item: oppItemId,
    target_board: "projects", target_item: project.id,
    details: `Created project "${oppName}" from won opportunity`,
    timestamp: now,
  });

  // Connect Project ↔ Opp, Contact, Org (all bidirectional)
  await connectItems(BOARDS.projects, project.id, "project_opportunity", [oppItemId]);
  if (contactIds.length) {
    await connectItems(BOARDS.projects, project.id, "project_contact", contactIds);
    for (const cid of contactIds) {
      await connectItems(BOARDS.contacts, cid, "contact_projects", [project.id]);
    }
  }
  if (orgIds.length) {
    await connectItems(BOARDS.projects, project.id, "connect_boards", orgIds);
    for (const oid of orgIds) {
      await connectItems(BOARDS.organizations, oid, "org_projects", [project.id]);
    }
  }

  // Sync to Supabase — church_items now shows Project data instead of Opp
  await syncProjectToChurch(project.id, oppItemId, adminClient);

  actions.push({
    action: "church_upgraded_to_project",
    source_board: "projects", source_item: project.id,
    details: `Church item now sourced from Project (was Opp). Live data from Project.`,
    timestamp: now,
  });

  await addUpdate(oppItemId,
    `**Converted to Project**\nProject: ${project.id}\nChurch synced to portal.`);

  return actions;
}

/**
 * Handle: Project column changed
 * → Re-sync to Supabase (Church shows updated Project data)
 */
export async function handleProjectChanged(
  projectItemId: string,
  columnId: string,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  // Find the linked Opp ID
  const project = await fetchItem(projectItemId);
  if (!project) return actions;

  const oppIds = getConnectedIds(project, "project_opportunity");
  const oppId = oppIds[0] || null;

  // Re-sync project data to church
  await syncProjectToChurch(projectItemId, oppId, adminClient);

  actions.push({
    action: "project_synced_to_church",
    source_board: "projects", source_item: projectItemId,
    details: `Project column ${columnId} changed → Church updated in portal`,
    timestamp: now,
  });

  return actions;
}

/**
 * Handle: Project status → Done (create Rebook Opp)
 */
export async function handleProjectCompleted(
  projectItemId: string,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  const project = await fetchItem(projectItemId);
  if (!project) return actions;

  const contactIds = getConnectedIds(project, "project_contact");
  const orgIds = getConnectedIds(project, "connect_boards");

  // Build rebook opp
  const rebookCols: Record<string, unknown> = {
    deal_stage: { label: "New" },
    opp_new_returning: { labels: ["Returning Client"] },
  };

  const fieldsToCopy: [string, string][] = [
    ["proj_school_name", "opp_school_name"],
    ["proj_num_students", "opp_num_students"],
    ["proj_num_groups", "opp_num_groups"],
    ["proj_num_days", "opp_num_days"],
    ["proj_num_tas", "opp_num_tas"],
    ["proj_program_type", "opp_program_type"],
    ["proj_grade_level", "opp_grade_level"],
    ["proj_school_type", "opp_school_type"],
    ["proj_email", "opp_email"],
    ["proj_phone", "opp_phone"],
    ["proj_state", "opp_state"],
    ["proj_street", "opp_street"],
    ["proj_city", "opp_city"],
    ["proj_postcode", "opp_postcode"],
  ];

  for (const [projCol, oppCol] of fieldsToCopy) {
    const text = getCol(project, projCol);
    if (text) rebookCols[oppCol] = text;
  }

  if (contactIds.length) rebookCols.deal_contact = { item_ids: contactIds.map(Number) };
  if (orgIds.length) rebookCols.deal_org = { item_ids: orgIds.map(Number) };

  const rebookName = `${project.name} - REBOOK`;
  const rebook = await createItem(BOARDS.opportunities, rebookName, rebookCols);

  if (rebook) {
    actions.push({
      action: "rebook_created",
      source_board: "projects", source_item: projectItemId,
      target_board: "opportunities", target_item: rebook.id,
      details: `Created rebook "${rebookName}" from completed project`,
      timestamp: now,
    });

    for (const cid of contactIds) await connectItems(BOARDS.contacts, cid, "contact_deal", [rebook.id]);
    for (const oid of orgIds) await connectItems(BOARDS.organizations, oid, "org_deals", [rebook.id]);

    // Sync rebook to church (new Opp, appears on portal)
    await syncOppToChurch(rebook.id, adminClient);

    await addUpdate(projectItemId,
      `**Rebook Created**\n${rebookName} (ID: ${rebook.id})\nLinked to same Contact + Org.`);
  }

  // Also update the completed project in church
  const oppIds = getConnectedIds(project, "project_opportunity");
  await syncProjectToChurch(projectItemId, oppIds[0] || null, adminClient);

  return actions;
}

/**
 * Main event router
 */
export async function handleCRMEvent(
  event: MondayEvent,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<CRMAction[]> {
  const boardId = String(event.boardId);
  const itemId = String(event.pulseId || event.itemId);
  const columnId = event.columnId || "";

  // ── Opportunities board ──
  if (boardId === BOARDS.opportunities) {
    if (columnId === "deal_stage") {
      const newLabel = event.value?.label?.text;
      if (newLabel === "Won") {
        return handleOppWon(itemId, adminClient);
      }
    }
    // Any opp change → sync to church
    return handleOppChanged(itemId, columnId, adminClient);
  }

  // ── Projects board ──
  if (boardId === BOARDS.projects) {
    if (columnId === "project_status") {
      const newLabel = event.value?.label?.text;
      if (newLabel === "Done") {
        return handleProjectCompleted(itemId, adminClient);
      }
    }
    // Any project change → sync to church
    return handleProjectChanged(itemId, columnId, adminClient);
  }

  return [];
}
