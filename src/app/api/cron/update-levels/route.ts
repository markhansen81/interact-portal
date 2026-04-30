import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";

// Recalculates pay levels for all TAs based on qualifying projects
// Called after work orders are completed or manually triggered

const PROGRAM_LEVEL_THRESHOLDS = [
  { level: 6, min: 40 },
  { level: 5, min: 18 },
  { level: 4, min: 11 },
  { level: 3, min: 6 },
  { level: 2, min: 0 },
  { level: 1, min: -1 }, // Interns
];

const CAMP_LEVEL_THRESHOLDS = [
  { level: 5, min: 20 },
  { level: 4, min: 11 },
  { level: 3, min: 6 },
  { level: 2, min: 2 },
  { level: 1, min: 0 },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: tas } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, pay_level, camp_level, qualifying_projects, total_camps, pd_workshop_credits")
    .eq("role", "ta");

  if (!tas) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  let updated = 0;

  for (const ta of tas) {
    // Calculate effective qualifying projects (including PD credits)
    const effectiveProjects = ta.qualifying_projects + Math.floor(ta.pd_workshop_credits / 4);

    // Determine new program level
    const newLevel = PROGRAM_LEVEL_THRESHOLDS.find((t) => effectiveProjects >= t.min)?.level || 2;

    // Determine new camp level
    const newCampLevel = CAMP_LEVEL_THRESHOLDS.find((t) => ta.total_camps >= t.min)?.level || 1;

    // Update if changed
    if (newLevel !== ta.pay_level || newCampLevel !== ta.camp_level) {
      await adminClient
        .from("profiles")
        .update({ pay_level: newLevel, camp_level: newCampLevel })
        .eq("id", ta.id);

      // Notify TA if level went up
      if (newLevel > ta.pay_level) {
        await notify({
          userId: ta.id,
          type: "level_up",
          title: "Level Up!",
          body: `Congratulations! You've advanced to Level ${newLevel}.`,
        });
      }

      if (newCampLevel > ta.camp_level) {
        await notify({
          userId: ta.id,
          type: "camp_level_up",
          title: "Camp Level Up!",
          body: `You've advanced to Camp Level ${newCampLevel}.`,
        });
      }

      updated++;
    }
  }

  return NextResponse.json({ success: true, updated });
}
