/**
 * Monday CRM Webhook Handler
 *
 * Receives webhooks from Monday when Opp or Project columns change.
 * Syncs data to Supabase `church_items` table for the portal Church view.
 *
 * Logic:
 * - Opp changed → sync Opp data to church_items (source: "opportunity")
 * - Opp Won → create Project on Monday + upgrade church_items source to "project"
 * - Project changed → sync Project data to church_items
 * - Project Done → create Rebook Opp + sync to church_items
 *
 * All actions logged to `crm_automation_log` for super admin visibility.
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

  const adminClient = createAdminClient();

  // Log every incoming event for debugging
  console.log("[CRM Webhook] Event received:", JSON.stringify(event));
  try {
    await adminClient.from("crm_automation_log").insert({
      action: "webhook_received",
      source_board: String(event.boardId || ""),
      source_item_id: String(event.pulseId || event.itemId || ""),
      details: `columnId=${event.columnId}, type=${event.type}, value=${JSON.stringify(event.value)?.slice(0, 200)}`,
      created_at: new Date().toISOString(),
    });
  } catch { /* ignore */ }

  try {
    // Process the CRM event
    const actions = await handleCRMEvent(event, adminClient);

    // Log all actions to Supabase
    if (actions.length > 0) {
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
        // Table might not exist yet
        console.log("[CRM Log]", JSON.stringify(actions, null, 2));
      }

      for (const a of actions) {
        console.log(`[CRM] ${a.action}: ${a.details}`);
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
