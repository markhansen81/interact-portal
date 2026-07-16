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
 * Set the Church status column to "On Church" after syncing
 */
async function setChurchStatus(boardId: string, itemId: string, label: string) {
  await mondayQuery(
    `mutation ($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }`,
    { boardId, itemId, cols: JSON.stringify({ church_status: { label } }) }
  );
}

// Lead → Contact/Opp field mapping (fields Monday doesn't auto-copy)
const LEAD_TO_CONTACT_MAP: Record<string, string> = {
  text_mm26h7f1: "contact_street",      // Address → Street
  lead_postcode: "contact_postcode",
  lead_city: "contact_city",
  lead_bundesland: "contact_state",      // State dropdown
  contact_first_name: "first_name",
  contact_last_name: "last_name",
};

const LEAD_TO_OPP_MAP: Record<string, string> = {
  text_mm26h7f1: "opp_street",           // Address → Street
  lead_postcode: "opp_postcode",
  lead_city: "opp_city",
  lead_bundesland: "opp_state",           // State dropdown
  dropdown_mktdq9nn: "opp_program_type",  // Program Type
  dropdown_mktdrem4: "opp_grade_level",   // Grade Level
  numeric_mktd9yve: "opp_num_students",   // Students
  numeric_mktdm7w5: "opp_num_groups",     // Groups
  numeric_mktd4bet: "opp_num_days",       // Days
  dropdown_mktdk7xc: "opp_school_year",   // School Year
  dropdown_mktdrcn0: "opp_school_type",   // School Type
  dropdown_mktdmbbk: "opp_lead_source",   // Lead Source
  preferred_dates: "opp_alt_dates",       // Preferred dates
};

const LEAD_TO_ORG_MAP: Record<string, string> = {
  text_mm26h7f1: "org_street",
  lead_postcode: "org_postcode",
  lead_city: "org_city",
  lead_bundesland: "org_state",
  dropdown_mktdrcn0: "org_school_type",
};

/**
 * Handle: Lead status changed to "Qualified"
 * Monday auto-creates Contact + Deal, but doesn't copy custom fields.
 * This handler finds the newly created Contact/Deal and copies missing fields.
 * Also creates/links Org.
 */
export async function handleLeadQualified(
  leadItemId: string,
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  // Wait a moment for Monday's auto-qualify to finish creating Contact + Deal
  await new Promise((r) => setTimeout(r, 3000));

  const lead = await fetchItem(leadItemId);
  if (!lead) return actions;

  const schoolName = lead.name.replace(/^LIVE TEST - /, "").replace(/^TEST - /, "");
  const firstName = getCol(lead, "contact_first_name");
  const lastName = getCol(lead, "contact_last_name");
  const email = getCol(lead, "lead_email");

  // Find the Contact Monday just created (match by email)
  const contactResult = await mondayQuery(
    `{ boards(ids: [${BOARDS.contacts}]) { items_page(limit: 10, query_params: {rules: [{column_id: "contact_email", compare_value: ["${email}"], operator: contains_text}]}) { items { id name column_values { id text value } } } } }`
  );
  const contacts = contactResult?.data?.boards?.[0]?.items_page?.items || [];
  const contact = contacts[0];

  // Find the Deal Monday just created (match by name containing school name)
  const oppResult = await mondayQuery(
    `{ boards(ids: [${BOARDS.opportunities}]) { items_page(limit: 10, query_params: {rules: [{column_id: "name", compare_value: ["${schoolName}"], operator: contains_text}], order_by: [{column_id: "__creation_log__", direction: desc}]}}) { items { id name column_values { id text value } } } } }`
  );
  const opps = oppResult?.data?.boards?.[0]?.items_page?.items || [];
  const opp = opps[0];

  // Copy fields to Contact
  if (contact) {
    const contactCols: Record<string, unknown> = {};
    for (const [leadCol, contactCol] of Object.entries(LEAD_TO_CONTACT_MAP)) {
      const text = getCol(lead, leadCol);
      if (!text) continue;
      const rawVal = getColValue(lead, leadCol);
      if (rawVal && typeof rawVal === "object" && "ids" in (rawVal as Record<string, unknown>)) {
        contactCols[contactCol] = { labels: [text] };
      } else {
        contactCols[contactCol] = text;
      }
    }

    if (Object.keys(contactCols).length > 0) {
      await mondayQuery(
        `mutation ($b: ID!, $i: ID!, $c: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $c, create_labels_if_missing: true) { id } }`,
        { b: BOARDS.contacts, i: contact.id, c: JSON.stringify(contactCols) }
      );
      actions.push({
        action: "contact_fields_copied",
        source_board: "leads", source_item: leadItemId,
        target_board: "contacts", target_item: contact.id,
        details: `Copied ${Object.keys(contactCols).length} fields from Lead to Contact`,
        timestamp: now,
      });
    }
  }

  // Copy fields to Opp
  if (opp) {
    const oppCols: Record<string, unknown> = {};
    oppCols.opp_school_name = schoolName;
    oppCols.opp_email = email;
    const phone = getCol(lead, "lead_phone");
    if (phone) oppCols.opp_phone = phone;

    for (const [leadCol, oppCol] of Object.entries(LEAD_TO_OPP_MAP)) {
      const text = getCol(lead, leadCol);
      if (!text) continue;
      const rawVal = getColValue(lead, leadCol);
      if (rawVal && typeof rawVal === "object" && "ids" in (rawVal as Record<string, unknown>)) {
        oppCols[oppCol] = { labels: [text] };
      } else if (oppCol.includes("num_")) {
        oppCols[oppCol] = text;
      } else {
        oppCols[oppCol] = text;
      }
    }

    oppCols.opp_new_returning = { labels: ["New Client"] };
    oppCols.opp_primary_contact = `${firstName} ${lastName}`.trim();

    if (Object.keys(oppCols).length > 0) {
      await mondayQuery(
        `mutation ($b: ID!, $i: ID!, $c: JSON!) { change_multiple_column_values(board_id: $b, item_id: $i, column_values: $c, create_labels_if_missing: true) { id } }`,
        { b: BOARDS.opportunities, i: opp.id, c: JSON.stringify(oppCols) }
      );
      actions.push({
        action: "opp_fields_copied",
        source_board: "leads", source_item: leadItemId,
        target_board: "opportunities", target_item: opp.id,
        details: `Copied ${Object.keys(oppCols).length} fields from Lead to Opp`,
        timestamp: now,
      });
    }
  }

  // Create or find Org
  const orgResult = await mondayQuery(
    `{ boards(ids: [${BOARDS.organizations}]) { items_page(limit: 5, query_params: {rules: [{column_id: "name", compare_value: ["${schoolName}"], operator: contains_text}]}) { items { id name } } } }`
  );
  const existingOrgs = orgResult?.data?.boards?.[0]?.items_page?.items || [];

  let orgId: string;
  if (existingOrgs.length > 0) {
    orgId = existingOrgs[0].id;
    actions.push({
      action: "org_found_existing",
      source_board: "leads", source_item: leadItemId,
      target_board: "organizations", target_item: orgId,
      details: `Found existing Org "${existingOrgs[0].name}" — linked`,
      timestamp: now,
    });
  } else {
    const orgCols: Record<string, unknown> = {};
    for (const [leadCol, orgCol] of Object.entries(LEAD_TO_ORG_MAP)) {
      const text = getCol(lead, leadCol);
      if (!text) continue;
      const rawVal = getColValue(lead, leadCol);
      if (rawVal && typeof rawVal === "object" && "ids" in (rawVal as Record<string, unknown>)) {
        orgCols[orgCol] = { labels: [text] };
      } else {
        orgCols[orgCol] = text;
      }
    }
    orgCols.org_country = "Germany";

    const newOrg = await createItem(BOARDS.organizations, schoolName, orgCols);
    if (newOrg) {
      orgId = newOrg.id;
      actions.push({
        action: "org_created",
        source_board: "leads", source_item: leadItemId,
        target_board: "organizations", target_item: orgId,
        details: `Created Org "${schoolName}" with address + school type`,
        timestamp: now,
      });
    } else {
      return actions;
    }
  }

  // Connect everything: Contact ↔ Org, Opp ↔ Org
  if (contact) {
    await connectItems(BOARDS.contacts, contact.id, "contact_account", [orgId]);
    await connectItems(BOARDS.organizations, orgId, "account_contact", [contact.id]);
  }
  if (opp) {
    await connectItems(BOARDS.opportunities, opp.id, "deal_org", [orgId]);
    await connectItems(BOARDS.organizations, orgId, "org_deals", [opp.id]);
  }

  actions.push({
    action: "lead_qualified_complete",
    source_board: "leads", source_item: leadItemId,
    details: `Lead qualified → Contact ${contact?.id || "?"}, Opp ${opp?.id || "?"}, Org ${orgId} all connected`,
    timestamp: now,
  });

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
  const newLabel = event.value?.label?.text;

  // ── Leads board ──
  if (boardId === BOARDS.leads) {
    if (columnId === "lead_status" && newLabel === "Qualified") {
      return handleLeadQualified(itemId, adminClient);
    }
    return [];
  }

  // ── Opportunities board ──
  if (boardId === BOARDS.opportunities) {

    // Church status set to "Add to Church" → sync Opp to church_items
    if (columnId === "church_status" && newLabel === "Add to Church") {
      const actions = await handleOppChanged(itemId, columnId, adminClient);
      await setChurchStatus(BOARDS.opportunities, itemId, "On Church");
      actions.push({
        action: "opp_added_to_church",
        source_board: "opportunities", source_item: itemId,
        details: "Opp added to Church via status trigger → set to 'On Church'",
        timestamp: new Date().toISOString(),
      });
      return actions;
    }

    // Stage → Won → create Project + upgrade church to project source
    if (columnId === "deal_stage" && newLabel === "Won") {
      return handleOppWon(itemId, adminClient);
    }

    // Any other change on an Opp that's already "On Church" → re-sync
    if (columnId !== "church_status") {
      const item = await fetchItem(itemId);
      if (item && getCol(item, "church_status") === "On Church") {
        return handleOppChanged(itemId, columnId, adminClient);
      }
    }

    return [];
  }

  // ── Projects board ──
  if (boardId === BOARDS.projects) {

    // Church status set to "Add to Church" → sync Project to church_items
    if (columnId === "church_status" && newLabel === "Add to Church") {
      const project = await fetchItem(itemId);
      const oppIds = project ? getConnectedIds(project, "project_opportunity") : [];
      const actions = await handleProjectChanged(itemId, columnId, adminClient);
      await setChurchStatus(BOARDS.projects, itemId, "On Church");
      actions.push({
        action: "project_added_to_church",
        source_board: "projects", source_item: itemId,
        details: "Project added to Church via status trigger → set to 'On Church'",
        timestamp: new Date().toISOString(),
      });
      return actions;
    }

    // Status → Done → create Rebook
    if (columnId === "project_status" && newLabel === "Done") {
      return handleProjectCompleted(itemId, adminClient);
    }

    // Any other change on a Project that's already "On Church" → re-sync
    if (columnId !== "church_status") {
      const item = await fetchItem(itemId);
      if (item && getCol(item, "church_status") === "On Church") {
        return handleProjectChanged(itemId, columnId, adminClient);
      }
    }

    return [];
  }

  return [];
}
