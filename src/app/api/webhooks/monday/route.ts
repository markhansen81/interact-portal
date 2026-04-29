import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayQuery, mapMondayItemToJob } from "@/lib/monday";

export async function POST(request: Request) {
  const body = await request.json();

  // Monday webhook challenge (verification)
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event) {
    return NextResponse.json({ error: "No event" }, { status: 400 });
  }

  const itemId = String(event.pulseId || event.itemId);
  const boardId = String(event.boardId);

  // Only process events from the jobs board
  if (boardId !== process.env.MONDAY_JOBS_BOARD_ID) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Fetch the full item from Monday
  const result = await mondayQuery(`
    query ($itemId: [ID!]) {
      items(ids: $itemId) {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  `, { itemId: [itemId] });

  const item = result?.data?.items?.[0];
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const jobData = mapMondayItemToJob(item);

  const adminClient = createAdminClient();

  // Upsert job — update if exists, create if not
  const { data: existingJob } = await adminClient
    .from("jobs")
    .select("id")
    .eq("monday_item_id", itemId)
    .single();

  if (existingJob) {
    await adminClient
      .from("jobs")
      .update(jobData)
      .eq("id", existingJob.id);
  } else {
    await adminClient.from("jobs").insert(jobData);
  }

  return NextResponse.json({ ok: true, itemId, action: existingJob ? "updated" : "created" });
}
