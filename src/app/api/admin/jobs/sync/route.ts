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

  // Fetch items from Monday with Staff Status not "Staffed"
  const result = await mondayQuery(`
    query {
      boards(ids: ${process.env.MONDAY_JOBS_BOARD_ID}) {
        items_page(limit: 100) {
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

  const items = result?.data?.boards?.[0]?.items_page?.items || [];
  const adminClient = createAdminClient();

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const jobData = mapMondayItemToJob(item);

    // Skip items with no TAs needed or no dates
    if (!jobData.start_date) continue;

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

  return NextResponse.json({ success: true, created, updated, total: items.length });
}
