/**
 * Monday CRM Pipeline Handler
 *
 * Handles the Opp → Project → Church pipeline:
 * 1. Opp stage → Won: creates Project + Church item, connects everything
 * 2. Project column changed: updates Church item direct columns
 * 3. Project completed: creates Rebook Opp
 *
 * Logs all actions to Supabase for admin visibility.
 */

import { mondayQuery } from "./monday";

// Board IDs
const BOARDS = {
  leads: "6976340556",
  contacts: "6976340559",
  organizations: "6976340560",
  opportunities: "6976340562",
  projects: "6976340557",
  church: "18422264891", // Church 2026
};

// Column mappings: Opp → Project (fields to copy when Opp becomes Project)
const OPP_TO_PROJECT_MAP: Record<string, string> = {
  opp_school_name: "proj_school_name",
  opp_num_students: "proj_num_students",
  opp_num_groups: "proj_num_groups",
  opp_num_days: "proj_num_days",
  opp_num_tas: "proj_num_tas",
  opp_price_pp: "proj_price_pp",
  opp_program_type: "proj_program_type",
  opp_grade_level: "proj_grade_level",
  opp_co_taught: "proj_co_taught",
  opp_accommodation: "proj_accommodation",
  opp_school_year: "proj_school_year",
  opp_email: "proj_email",
  opp_phone: "proj_phone",
  opp_staffing_notes: "proj_staffing_notes",
  opp_tarif: "proj_tarif",
  opp_state: "proj_state",
  opp_street: "proj_street",
  opp_city: "proj_city",
  opp_postcode: "proj_postcode",
  opp_school_type: "proj_school_type",
  opp_project_start: "project_timeline",
  opp_alt_dates: "proj_secondary_contact",
};

// Project → Church (fields to push to Church direct columns)
const PROJECT_TO_CHURCH_MAP: Record<string, string> = {
  proj_num_students: "num_participants",
  proj_num_groups: "num_groups",
  proj_num_days: "num_days",
  proj_num_tas: "num_tas",
  proj_price_pp: "price_pp",
  proj_school_name: "name", // item name
  proj_email: "contact_email_direct",
  proj_phone: "teacher_contact",
};

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

interface CRMAction {
  action: string;
  source_board: string;
  source_item: string;
  target_board?: string;
  target_item?: string;
  details: string;
  timestamp: string;
}

/**
 * Fetch a Monday item with all column values
 */
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

/**
 * Get column value as text from an item
 */
function getCol(
  item: { column_values: { id: string; text: string; value: string | null }[] },
  colId: string
): string {
  return item.column_values.find((c: { id: string }) => c.id === colId)?.text || "";
}

/**
 * Get column raw value (JSON) from an item
 */
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

/**
 * Get connected item IDs from a board relation column
 */
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

/**
 * Create an item on a board with column values
 */
async function createItem(
  boardId: string,
  name: string,
  columnValues: Record<string, unknown>,
  groupId?: string
) {
  const result = await mondayQuery(
    `mutation ($boardId: ID!, $name: String!, $cols: JSON!, $group: String) {
      create_item(
        board_id: $boardId,
        item_name: $name,
        column_values: $cols,
        group_id: $group,
        create_labels_if_missing: true
      ) { id name }
    }`,
    {
      boardId,
      name,
      cols: JSON.stringify(columnValues),
      group: groupId || "topics",
    }
  );
  return result?.data?.create_item || null;
}

/**
 * Connect items via board relation
 */
async function connectItems(
  boardId: string,
  itemId: string,
  relationColId: string,
  targetIds: string[]
) {
  const colValues = {
    [relationColId]: { item_ids: targetIds.map(Number) },
  };
  await mondayQuery(
    `mutation ($boardId: ID!, $itemId: ID!, $cols: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
    }`,
    { boardId, itemId, cols: JSON.stringify(colValues) }
  );
}

/**
 * Add an update/comment to an item
 */
async function addUpdate(itemId: string, body: string) {
  await mondayQuery(
    `mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }`,
    { itemId, body }
  );
}

// ────────────────────────────────────────────
// PIPELINE HANDLERS
// ────────────────────────────────────────────

/**
 * Handle: Opp Stage changed to "Won"
 * → Create Project + Church item, connect everything
 */
export async function handleOppWon(
  oppItemId: string
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  // 1. Fetch the full Opp item
  const opp = await fetchItem(oppItemId);
  if (!opp) return actions;

  const oppName = opp.name;
  const contactIds = getConnectedIds(opp, "deal_contact");
  const orgIds = getConnectedIds(opp, "deal_org");

  // 2. Build Project column values from Opp
  const projectCols: Record<string, unknown> = {
    project_status: { label: "Working on it" },
  };

  // Copy mapped fields
  for (const [oppCol, projCol] of Object.entries(OPP_TO_PROJECT_MAP)) {
    const text = getCol(opp, oppCol);
    const rawVal = getColValue(opp, oppCol);

    if (!text && !rawVal) continue;

    // Handle different column types
    if (projCol === "project_timeline" && text) {
      // Project start date → timeline
      const dateStr = text.slice(0, 10);
      const endCol = getCol(opp, "opp_project_end");
      const endStr = endCol ? endCol.slice(0, 10) : dateStr;
      projectCols[projCol] = { from: dateStr, to: endStr };
    } else if (
      projCol.includes("num_") ||
      projCol.includes("price_") ||
      projCol.includes("min_")
    ) {
      // Numbers
      if (text) projectCols[projCol] = text;
    } else if (rawVal && typeof rawVal === "object" && "linkedPulseIds" in (rawVal as Record<string, unknown>)) {
      // Skip relation columns
    } else if (text) {
      // Check if it's a dropdown/status (has label structure)
      if (
        rawVal &&
        typeof rawVal === "object" &&
        ("ids" in (rawVal as Record<string, unknown>) || "index" in (rawVal as Record<string, unknown>))
      ) {
        projectCols[projCol] = { labels: [text] };
      } else if (
        projCol.includes("staffing") ||
        projCol.includes("details") ||
        projCol.includes("feedback")
      ) {
        projectCols[projCol] = { text };
      } else {
        projectCols[projCol] = text;
      }
    }
  }

  // 3. Create the Project
  const project = await createItem(
    BOARDS.projects,
    oppName,
    projectCols,
    "new_group29179"
  );

  if (!project) {
    actions.push({
      action: "ERROR",
      source_board: "opportunities",
      source_item: oppItemId,
      details: `Failed to create project for ${oppName}`,
      timestamp: now,
    });
    return actions;
  }

  actions.push({
    action: "project_created",
    source_board: "opportunities",
    source_item: oppItemId,
    target_board: "projects",
    target_item: project.id,
    details: `Created project "${oppName}" from won opportunity`,
    timestamp: now,
  });

  // 4. Connect Project to Opp, Contact, Org
  await connectItems(BOARDS.projects, project.id, "project_opportunity", [
    oppItemId,
  ]);
  if (contactIds.length) {
    await connectItems(
      BOARDS.projects,
      project.id,
      "project_contact",
      contactIds
    );
    // Reverse: Contact → Project
    for (const cid of contactIds) {
      await connectItems(BOARDS.contacts, cid, "contact_projects", [
        project.id,
      ]);
    }
  }
  if (orgIds.length) {
    await connectItems(BOARDS.projects, project.id, "connect_boards", orgIds);
    // Reverse: Org → Project
    for (const oid of orgIds) {
      await connectItems(BOARDS.organizations, oid, "org_projects", [
        project.id,
      ]);
    }
  }

  // 5. Create Church item
  const churchCols: Record<string, unknown> = {};

  // Connect to all CRM entities
  churchCols.rel_project = { item_ids: [Number(project.id)] };
  churchCols.rel_opportunity = { item_ids: [Number(oppItemId)] };
  if (contactIds.length) {
    churchCols.rel_contact = { item_ids: contactIds.map(Number) };
  }
  if (orgIds.length) {
    churchCols.rel_organization = { item_ids: orgIds.map(Number) };
  }

  // Church item name = school name or opp name
  const schoolName = getCol(opp, "opp_school_name") || oppName;

  const church = await createItem(
    BOARDS.church,
    schoolName,
    churchCols,
    "topics" // Will be moved to correct KW group later or manually
  );

  if (church) {
    actions.push({
      action: "church_created",
      source_board: "projects",
      source_item: project.id,
      target_board: "church",
      target_item: church.id,
      details: `Created Church item "${schoolName}" - mirrors will auto-populate from connected CRM items`,
      timestamp: now,
    });

    // Add a note to the Church item
    await addUpdate(
      church.id,
      `**Auto-created from Opportunity Won**\nOpp: ${oppName}\nProject: ${project.id}\nMirrors connected - data will auto-populate.`
    );
  }

  // 6. Add note to the Opp
  await addUpdate(
    oppItemId,
    `**Converted to Project**\nProject ID: ${project.id}\nChurch ID: ${church?.id || "failed"}\nAll connections established.`
  );

  return actions;
}

/**
 * Handle: Project column changed
 * → If Church item is connected, the mirrors auto-update.
 * → No action needed (mirrors handle this natively!)
 * → But we log it for visibility.
 */
export async function handleProjectUpdated(
  projectItemId: string,
  columnId: string,
  newValue: string
): Promise<CRMAction[]> {
  return [
    {
      action: "project_updated",
      source_board: "projects",
      source_item: projectItemId,
      details: `Column ${columnId} changed to "${newValue}" - Church mirrors auto-updated`,
      timestamp: new Date().toISOString(),
    },
  ];
}

/**
 * Handle: Project status → Done (create Rebook Opp)
 */
export async function handleProjectCompleted(
  projectItemId: string
): Promise<CRMAction[]> {
  const actions: CRMAction[] = [];
  const now = new Date().toISOString();

  const project = await fetchItem(projectItemId);
  if (!project) return actions;

  const contactIds = getConnectedIds(project, "project_contact");
  const orgIds = getConnectedIds(project, "connect_boards");

  // Build rebook opp from project data
  const rebookCols: Record<string, unknown> = {
    deal_stage: { label: "New" },
  };

  // Copy key fields
  const fieldsToCopy = [
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
    if (text) {
      if (
        oppCol.includes("num_") ||
        oppCol.includes("price_")
      ) {
        rebookCols[oppCol] = text;
      } else {
        rebookCols[oppCol] = text;
      }
    }
  }

  // Connect to same Contact + Org
  if (contactIds.length) {
    rebookCols.deal_contact = { item_ids: contactIds.map(Number) };
  }
  if (orgIds.length) {
    rebookCols.deal_org = { item_ids: orgIds.map(Number) };
  }

  rebookCols.opp_new_returning = { labels: ["Returning Client"] };

  const rebookName = `${project.name} - REBOOK`;
  const rebook = await createItem(BOARDS.opportunities, rebookName, rebookCols);

  if (rebook) {
    actions.push({
      action: "rebook_created",
      source_board: "projects",
      source_item: projectItemId,
      target_board: "opportunities",
      target_item: rebook.id,
      details: `Created rebook opportunity "${rebookName}" from completed project`,
      timestamp: now,
    });

    // Link reverse relations
    for (const cid of contactIds) {
      await connectItems(BOARDS.contacts, cid, "contact_deal", [rebook.id]);
    }
    for (const oid of orgIds) {
      await connectItems(BOARDS.organizations, oid, "org_deals", [rebook.id]);
    }

    await addUpdate(
      projectItemId,
      `**Rebook Opportunity Created**\nNew Opp: ${rebookName} (ID: ${rebook.id})\nLinked to same Contact + Org.`
    );
  }

  return actions;
}

/**
 * Main event router
 */
export async function handleCRMEvent(
  event: MondayEvent
): Promise<CRMAction[]> {
  const boardId = String(event.boardId);
  const itemId = String(event.pulseId || event.itemId);
  const columnId = event.columnId;

  // Opp board: stage changed
  if (boardId === BOARDS.opportunities && columnId === "deal_stage") {
    const newLabel = event.value?.label?.text;
    if (newLabel === "Won") {
      return handleOppWon(itemId);
    }
  }

  // Project board: status changed to Done
  if (boardId === BOARDS.projects && columnId === "project_status") {
    const newLabel = event.value?.label?.text;
    if (newLabel === "Done") {
      return handleProjectCompleted(itemId);
    }
  }

  // Project board: any column changed (for logging)
  if (boardId === BOARDS.projects && columnId) {
    const newText = event.value?.label?.text || "";
    return handleProjectUpdated(itemId, columnId, newText);
  }

  return [];
}
