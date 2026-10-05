import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getWeekdayDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().split("T")[0]);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Fetch project
  const { data: project } = await adminClient
    .from("projects")
    .select("start_date, end_date, program_type")
    .eq("id", id)
    .single();

  if (!project || !project.start_date || !project.end_date) {
    return NextResponse.json(
      { error: "Project not found or missing dates" },
      { status: 400 }
    );
  }

  const projectDates = getWeekdayDates(project.start_date, project.end_date);
  const totalDays = projectDates.length;

  if (totalDays === 0) {
    return NextResponse.json({ tas: [], totalDays: 0 });
  }

  // Fetch all active TAs
  const { data: allTas } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url, pay_level, is_active")
    .eq("role", "ta")
    .eq("is_active", true);

  if (!allTas || allTas.length === 0) {
    return NextResponse.json({ tas: [], totalDays });
  }

  const taIds = allTas.map((t) => t.id);

  // Fetch availability for all TAs in the project date range
  const { data: availabilityRows } = await adminClient
    .from("availability")
    .select("ta_id, date, status")
    .in("ta_id", taIds)
    .in("date", projectDates)
    .eq("status", "available");

  // Build availability map: ta_id -> set of available dates
  const availabilityMap = new Map<string, Set<string>>();
  for (const row of availabilityRows || []) {
    if (!availabilityMap.has(row.ta_id)) {
      availabilityMap.set(row.ta_id, new Set());
    }
    availabilityMap.get(row.ta_id)!.add(row.date);
  }

  // Fetch program preferences for the project's program type
  const preferenceMap = new Map<string, string>();
  if (project.program_type) {
    const { data: prefs } = await adminClient
      .from("ta_program_preferences")
      .select("ta_id, preference")
      .eq("program_type", project.program_type)
      .in("ta_id", taIds);

    for (const pref of prefs || []) {
      preferenceMap.set(pref.ta_id, pref.preference);
    }
  }

  // Check for existing work orders on this project
  const { data: existingWOs } = await adminClient
    .from("work_orders")
    .select("ta_id")
    .eq("project_id", id)
    .not("status", "eq", "cancelled");

  const assignedTaIds = new Set((existingWOs || []).map((wo) => wo.ta_id));

  // Also check project_tas assignments
  const { data: existingAssignments } = await adminClient
    .from("project_tas")
    .select("ta_id")
    .eq("project_id", id);

  const assignedViaPT = new Set((existingAssignments || []).map((a) => a.ta_id));

  // Build TA list with scores
  const preferenceOrder: Record<string, number> = {
    pro: 0,
    yes: 1,
    unknown: 2,
    no: 3,
  };

  const tas = allTas.map((ta) => {
    const availableDatesSet = availabilityMap.get(ta.id) || new Set<string>();
    const availableDays = projectDates.filter((d) => availableDatesSet.has(d));
    const preference = preferenceMap.get(ta.id) || "unknown";
    const isAlreadyAssigned = assignedTaIds.has(ta.id) || assignedViaPT.has(ta.id);

    return {
      id: ta.id,
      name: `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email,
      first_name: ta.first_name,
      last_name: ta.last_name,
      email: ta.email,
      photo_url: ta.photo_url,
      pay_level: ta.pay_level,
      available_days: availableDays.length,
      available_dates: availableDays,
      total_days: totalDays,
      preference,
      is_already_assigned: isAlreadyAssigned,
    };
  });

  // Sort: already assigned last, then fully available first, then by preference
  tas.sort((a, b) => {
    if (a.is_already_assigned !== b.is_already_assigned) {
      return a.is_already_assigned ? 1 : -1;
    }
    // Sort by available days descending
    if (b.available_days !== a.available_days) {
      return b.available_days - a.available_days;
    }
    // Then by preference
    return (preferenceOrder[a.preference] ?? 2) - (preferenceOrder[b.preference] ?? 2);
  });

  return NextResponse.json({ tas, totalDays, projectDates });
}
