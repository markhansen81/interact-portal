import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackAlert } from "@/lib/slack";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select("id, name, school, schedule_confirmed_at")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.schedule_confirmed_at) {
    return NextResponse.json({
      success: true,
      schedule_confirmed_at: project.schedule_confirmed_at,
      message: "Already confirmed",
    });
  }

  const now = new Date().toISOString();

  const { error } = await adminClient
    .from("projects")
    .update({ schedule_confirmed_at: now })
    .eq("id", project.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Send Slack notification
  await sendSlackAlert({
    type: "success",
    title: "Stundenplan bestaetigt",
    message: `Die Schule hat den Stundenplan fuer das Projekt bestaetigt.`,
    fields: [
      { label: "Projekt", value: project.name },
      { label: "Schule", value: project.school || "-" },
    ],
  });

  return NextResponse.json({ success: true, schedule_confirmed_at: now });
}
