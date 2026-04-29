import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get the job
  const { data: job } = await adminClient
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Get all active TAs
  const { data: allTAs } = await adminClient
    .from("profiles")
    .select("*")
    .eq("role", "ta")
    .eq("is_active", true);

  if (!allTAs) {
    return NextResponse.json({ recommendations: [] });
  }

  // Get TAs already assigned to this job
  const { data: existingWOs } = await adminClient
    .from("work_orders")
    .select("ta_id")
    .eq("job_id", id)
    .in("status", ["sent", "signed"]);

  const assignedTAIds = new Set((existingWOs || []).map((wo) => wo.ta_id));

  // Get program preferences for all TAs
  const { data: allPrefs } = await adminClient
    .from("ta_program_preferences")
    .select("*");

  const prefsByTA = new Map<string, Map<string, string>>();
  (allPrefs || []).forEach((p) => {
    if (!prefsByTA.has(p.ta_id)) prefsByTA.set(p.ta_id, new Map());
    prefsByTA.get(p.ta_id)!.set(p.program_type, p.preference);
  });

  // Get availability conflicts
  let unavailableTAs = new Set<string>();
  if (job.start_date && job.end_date) {
    const { data: conflicts } = await adminClient
      .from("availability")
      .select("ta_id")
      .gte("date", job.start_date)
      .lte("date", job.end_date)
      .eq("status", "unavailable");

    unavailableTAs = new Set((conflicts || []).map((c) => c.ta_id));
  }

  // Score each TA
  const recommendations = allTAs
    .filter((ta) => !assignedTAIds.has(ta.id))
    .map((ta) => {
      let score = 0;
      const reasons: string[] = [];

      // Availability check
      const isAvailable = !unavailableTAs.has(ta.id);
      if (isAvailable) {
        score += 30;
        reasons.push("Available for dates");
      } else {
        reasons.push("May have conflicts");
      }

      // Program fit
      const taPrefs = prefsByTA.get(ta.id);
      if (taPrefs && job.program_type) {
        const pref = taPrefs.get(job.program_type);
        if (pref === "pro") {
          score += 40;
          reasons.push(`Pro at ${job.program_type}`);
        } else if (pref === "yes") {
          score += 25;
          reasons.push(`Can do ${job.program_type}`);
        } else if (pref === "pro?") {
          score += 30;
          reasons.push(`Potential Pro at ${job.program_type}`);
        }
      }

      // Onboarding status
      if (ta.onboarding_status === "ready") {
        score += 15;
        reasons.push("Fully onboarded");
      } else {
        reasons.push(`Onboarding: ${ta.onboarding_status}`);
      }

      // Training
      if (ta.training_online && ta.training_offline) {
        score += 10;
        reasons.push("Training complete");
      }

      // Experience (higher level = more experienced)
      score += ta.pay_level * 2;
      if (ta.pay_level >= 3) {
        reasons.push(`Level ${ta.pay_level} — experienced`);
      }

      return {
        ta,
        score,
        reasons,
        isAvailable,
      };
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ recommendations });
}
