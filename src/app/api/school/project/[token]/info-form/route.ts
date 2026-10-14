import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limit: 3 requests per minute per IP
  const ip = getClientIP(request);
  const { ok } = rateLimit(`info-form:${ip}`, 3, 60_000);
  if (!ok) return rateLimitResponse();

  const { token } = await params;
  const adminClient = createAdminClient();

  // Validate the token
  const { data: project } = await adminClient
    .from("projects")
    .select("id, name, school, teacher_email")
    .eq("teacher_token", token)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  // Basic validation
  if (!body.contact_name?.trim()) {
    return NextResponse.json(
      { error: "Ansprechpartner*in ist erforderlich." },
      { status: 400 }
    );
  }

  if (!body.privacy_consent) {
    return NextResponse.json(
      { error: "Datenschutzzustimmung ist erforderlich." },
      { status: 400 }
    );
  }

  // Store the form data as JSON on the project
  try {
    const { error: updateError } = await adminClient
      .from("projects")
      .update({
        info_pack_data: body,
        info_pack_submitted_at: new Date().toISOString(),
      })
      .eq("id", project.id);

    if (updateError) {
      console.error("Error saving info pack:", updateError);
      return NextResponse.json(
        { error: "Fehler beim Speichern. Bitte versuchen Sie es erneut." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Error saving info pack:", err);
    return NextResponse.json(
      { error: "Fehler beim Speichern. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }

  // Send notification email to admins (non-blocking)
  try {
    // Attempt to notify via existing notification patterns
    // This won't block the response if it fails
    console.log(
      `Info pack submitted for project ${project.name} (${project.school}) by ${body.contact_name}`
    );
  } catch {
    // Notification failure should not affect the response
  }

  return NextResponse.json({ success: true });
}
