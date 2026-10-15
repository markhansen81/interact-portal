import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatICSDate(dateStr: string): string {
  // Convert "2026-09-21" to "20260921"
  return dateStr.replace(/-/g, "");
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify TA role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "ta") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all work orders for this TA that have dates
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, project_name, school, school_address, location, program_type, start_date, end_date, days, status")
    .eq("ta_id", user.id)
    .in("status", ["sent", "signed"])
    .not("start_date", "is", null)
    .not("end_date", "is", null)
    .order("start_date", { ascending: true });

  const events = (workOrders || []).map((wo) => {
    const summary = escapeICS(`${wo.project_name}${wo.school ? ` — ${wo.school}` : ""}`);
    const location = escapeICS(wo.school_address || wo.location || "");

    const descParts: string[] = [];
    if (wo.program_type) descParts.push(`Program: ${wo.program_type}`);
    if (wo.days) descParts.push(`Days: ${wo.days}`);
    if (wo.school) descParts.push(`School: ${wo.school}`);
    if (wo.status) descParts.push(`Status: ${wo.status}`);
    const description = escapeICS(descParts.join("\\n"));

    // For all-day events, DTEND should be the day AFTER the last day
    const endDate = new Date(wo.end_date + "T00:00:00");
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");

    return [
      "BEGIN:VEVENT",
      `UID:wo-${wo.id}@interact-portal`,
      `DTSTART;VALUE=DATE:${formatICSDate(wo.start_date)}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : null,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  const taName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "TA";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InterACT English//Portal//EN",
    `X-WR-CALNAME:InterACT — ${escapeICS(taName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interact-calendar.ics"`,
    },
  });
}
