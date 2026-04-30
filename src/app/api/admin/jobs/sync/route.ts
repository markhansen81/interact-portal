import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayQuery, mapMondayItemToJob } from "@/lib/monday";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if we should only sync upcoming
  const url = new URL(request.url);
  const upcomingOnly = url.searchParams.get("upcoming") !== "false";

  // Fetch all items from Monday (up to 500)
  const result = await mondayQuery(`
    query {
      boards(ids: ${process.env.MONDAY_JOBS_BOARD_ID}) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `);

  const allItems = result?.data?.boards?.[0]?.items_page?.items || [];
  const adminClient = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of allItems) {
    const jobData = mapMondayItemToJob(item);

    // Skip items without dates
    if (!jobData.start_date) {
      skipped++;
      continue;
    }

    // If upcoming only, skip past jobs
    if (upcomingOnly && jobData.end_date && jobData.end_date < today) {
      skipped++;
      continue;
    }

    const { data: existing } = await adminClient
      .from("jobs")
      .select("id")
      .eq("monday_item_id", item.id)
      .single();

    if (existing) {
      await adminClient.from("jobs").update(jobData).eq("id", existing.id);
      updated++;
    } else {
      await adminClient.from("jobs").insert(jobData);
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    created,
    updated,
    skipped,
    total: allItems.length,
  });
}
