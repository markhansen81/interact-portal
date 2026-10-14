import { mondayQuery } from "./monday";
import { sendSlackAlert } from "./slack";

const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID || "18410746908";

/**
 * Auto-create a bug ticket on Monday.com and optionally alert Slack.
 * Returns the Monday item ID or null on failure.
 */
export async function createBugTicket(
  title: string,
  description: string,
  severity: "critical" | "high" | "medium" | "low"
): Promise<string | null> {
  if (!process.env.MONDAY_API_TOKEN) {
    console.log("[BugTracker] No MONDAY_API_TOKEN — skipping ticket creation");
    return null;
  }

  try {
    // Find or use the "Testing" group
    const boardResult = await mondayQuery(`
      query ($boardId: [ID!]!) {
        boards(ids: $boardId) {
          groups { id title }
        }
      }
    `, { boardId: [MONDAY_BOARD_ID] });

    const groups = boardResult?.data?.boards?.[0]?.groups ?? [];
    const testingGroup = groups.find(
      (g: { id: string; title: string }) =>
        g.title.toLowerCase().includes("testing") || g.title.toLowerCase().includes("bug")
    );
    const groupId = testingGroup?.id || groups[0]?.id;

    if (!groupId) {
      console.error("[BugTracker] No group found on board");
      return null;
    }

    // Severity-to-status label mapping
    const statusLabel: Record<string, string> = {
      critical: "Critical",
      high: "Working on it",
      medium: "Stuck",
      low: "Done",
    };

    // Create the item
    const result = await mondayQuery(`
      mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $values: JSON!) {
        create_item(
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName,
          column_values: $values
        ) {
          id
        }
      }
    `, {
      boardId: MONDAY_BOARD_ID,
      groupId,
      itemName: `[BUG] ${title}`,
      values: JSON.stringify({
        status: { label: statusLabel[severity] || "Working on it" },
      }),
    });

    const itemId = result?.data?.create_item?.id;

    if (itemId) {
      // Add description as an update/comment
      await mondayQuery(`
        mutation ($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) { id }
        }
      `, {
        itemId,
        body: `**Severity:** ${severity.toUpperCase()}\n\n${description}`,
      });

      console.log(`[BugTracker] Created Monday ticket ${itemId}: ${title}`);
    }

    // Alert Slack for critical/high severity
    if (severity === "critical" || severity === "high") {
      await sendSlackAlert({
        type: severity === "critical" ? "critical" : "warning",
        title: `Bug Reported: ${title}`,
        message: description,
        fields: [
          { label: "Severity", value: severity.toUpperCase() },
          { label: "Monday Ticket", value: itemId ? `#${itemId}` : "Failed to create" },
        ],
      });
    }

    return itemId || null;
  } catch (err) {
    console.error("[BugTracker] Failed to create ticket:", err);
    return null;
  }
}
