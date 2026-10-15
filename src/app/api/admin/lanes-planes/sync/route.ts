import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTAsToLanesPlanes } from "@/lib/lanes-planes";
import { sendSlackAlert } from "@/lib/slack";

export async function POST(request: Request) {
  // Support both admin auth and cron secret
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
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
  }

  const adminClient = createAdminClient();

  // Fetch ALL active TAs — L&P requires complete user list every time
  const { data: tas, error } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("role", "ta")
    .eq("is_active", true)
    .eq("onboarding_status", "ready");

  if (error || !tas) {
    return NextResponse.json(
      { error: "Failed to fetch TAs" },
      { status: 500 }
    );
  }

  // Filter out TAs without required fields
  const validTAs = tas.filter(
    (ta) => ta.email && ta.first_name && ta.last_name
  );
  const skippedCount = tas.length - validTAs.length;

  // Call L&P ExtAPI
  const result = await syncTAsToLanesPlanes(validTAs);

  if (!result.ok) {
    await sendSlackAlert({
      type: "critical",
      title: "L&P Sync Failed",
      message: `Sync failed with status ${result.status}: ${result.error || "Unknown error"}`,
    });

    return NextResponse.json(
      { ...result, synced: 0, skipped: skippedCount },
      { status: 500 }
    );
  }

  // On success, mark all synced TAs
  const now = new Date().toISOString();
  const syncedIds = validTAs.map((ta) => ta.id);

  if (syncedIds.length > 0) {
    await adminClient
      .from("profiles")
      .update({
        lanes_planes_synced: true,
        lanes_planes_synced_at: now,
      })
      .in("id", syncedIds);
  }

  // Send Slack success alert
  await sendSlackAlert({
    type: "success",
    title: "L&P Sync Complete",
    message: `L&P sync: ${validTAs.length} TAs synced`,
    fields: [
      { label: "Synced", value: String(validTAs.length) },
      { label: "Skipped (incomplete)", value: String(skippedCount) },
    ],
  });

  return NextResponse.json({
    ...result,
    synced: validTAs.length,
    skipped: skippedCount,
    syncedAt: now,
  });
}

// GET for cron job support
export async function GET(request: Request) {
  return POST(request);
}
