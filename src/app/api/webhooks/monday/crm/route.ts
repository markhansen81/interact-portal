/**
 * Monday CRM Webhook Handler
 *
 * Receives webhooks from Monday when:
 * - Opp stage changes (→ creates Project + Church when "Won")
 * - Project status changes (→ creates Rebook when "Done")
 * - Project columns change (→ logged for visibility)
 *
 * All actions logged to Supabase `crm_automation_log` table
 * for admin visibility — super admins can see every action.
 *
 * Setup:
 * 1. Register webhooks on Opp board (change_column_value event)
 * 2. Register webhooks on Project board (change_column_value event)
 * 3. URL: https://your-domain/api/webhooks/monday/crm
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCRMEvent } from "@/lib/monday-crm";

export async function POST(request: Request) {
  const body = await request.json();

  // Monday webhook challenge (verification handshake)
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event) {
    return NextResponse.json({ error: "No event" }, { status: 400 });
  }

  try {
    // Process the CRM event
    const actions = await handleCRMEvent(event);

    // Log all actions to Supabase for admin visibility
    if (actions.length > 0) {
      const adminClient = createAdminClient();

      // Try to insert into crm_automation_log table
      // If table doesn't exist yet, just log to console
      try {
        await adminClient.from("crm_automation_log").insert(
          actions.map((a) => ({
            action: a.action,
            source_board: a.source_board,
            source_item_id: a.source_item,
            target_board: a.target_board || null,
            target_item_id: a.target_item || null,
            details: a.details,
            created_at: a.timestamp,
          }))
        );
      } catch {
        // Table might not exist yet, log to console
        console.log("[CRM Automation]", JSON.stringify(actions, null, 2));
      }

      // Log summary
      for (const a of actions) {
        console.log(
          `[CRM] ${a.action}: ${a.details}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      actions: actions.length,
      summary: actions.map((a) => a.action),
    });
  } catch (error) {
    console.error("[CRM Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal error", message: String(error) },
      { status: 500 }
    );
  }
}
