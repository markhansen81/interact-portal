import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit";
import { sendSlackAlert } from "@/lib/slack";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limit: 3 requests per minute per IP
  const ip = getClientIP(request);
  const { ok } = rateLimit(`feedback:${ip}`, 3, 60_000);
  if (!ok) return rateLimitResponse();

  const { token } = await params;
  const adminClient = createAdminClient();

  // Validate the token
  const { data: project } = await adminClient
    .from("projects")
    .select("id, name, school, status, feedback_submitted_at")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow feedback for active or completed projects
  if (project.status === "upcoming") {
    return NextResponse.json(
      { error: "Feedback ist erst nach Projektbeginn möglich." },
      { status: 400 }
    );
  }

  const body = await request.json();

  // Basic validation
  if (typeof body.overall_rating !== "number" || body.overall_rating < 1 || body.overall_rating > 5) {
    return NextResponse.json(
      { error: "Bitte geben Sie eine Gesamtbewertung ab." },
      { status: 400 }
    );
  }

  // Store the feedback data
  try {
    const { error: updateError } = await adminClient
      .from("projects")
      .update({
        feedback_data: body,
        feedback_submitted_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    if (updateError) {
      console.error("Error saving feedback:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Speichern. Bitte versuchen Sie es erneut." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Error saving feedback:", err);
    return NextResponse.json(
      { error: "Fehler beim Speichern. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }

  // Send Slack notification (non-blocking)
  try {
    const starEmoji = "\u2B50".repeat(body.overall_rating);
    const rebookText =
      body.would_rebook === "Ja"
        ? "Ja!"
        : body.would_rebook === "Vielleicht"
        ? "Vielleicht"
        : "Nein";

    await sendSlackAlert({
      type: "info",
      title: "Feedback erhalten",
      message: `Feedback eingegangen für *${project.name}* (${project.school || "Unbekannt"})`,
      fields: [
        { label: "Gesamtbewertung", value: `${starEmoji} (${body.overall_rating}/5)` },
        { label: "Organisation", value: body.logistics_rating ? `${body.logistics_rating}/5` : "-" },
        { label: "Kommunikation", value: body.communication_rating ? `${body.communication_rating}/5` : "-" },
        { label: "Wieder buchen?", value: rebookText },
      ],
    });
  } catch {
    // Notification failure should not affect the response
  }

  return NextResponse.json({ success: true });
}
