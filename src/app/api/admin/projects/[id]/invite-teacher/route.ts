import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify admin
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

  // Check if email was provided in the body (manual override)
  const body = await request.json().catch(() => ({}));

  // Fetch project
  const { data: project } = await adminClient
    .from("projects")
    .select("id, name, school, teacher_email, teacher_name, teacher_token, start_date, end_date")
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Allow setting teacher_email from the request body
  let teacherEmail = project.teacher_email;
  let teacherName = project.teacher_name;

  if (body.teacher_email) {
    teacherEmail = body.teacher_email;
    teacherName = body.teacher_name || teacherName;
    await adminClient
      .from("projects")
      .update({
        teacher_email: teacherEmail,
        ...(body.teacher_name ? { teacher_name: body.teacher_name } : {}),
      })
      .eq("id", id);
  }

  if (!teacherEmail) {
    return NextResponse.json(
      { error: "No teacher email set for this project" },
      { status: 400 }
    );
  }

  // Generate token if not present
  let token = project.teacher_token;
  if (!token) {
    token = crypto.randomUUID();
    await adminClient
      .from("projects")
      .update({ teacher_token: token })
      .eq("id", id);
  }

  // Build date string
  let dateStr = "";
  if (project.start_date && project.end_date) {
    dateStr = `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`;
  }

  const schoolPortalUrl = `${APP_URL}/school/project/${token}`;

  // Send invite email
  const result = await sendEmail({
    to: teacherEmail,
    subject: `InterACT Project: ${project.name} — Set Up Your Class`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">Welcome to InterACT English</h2>
        <p>Dear ${teacherName || "Teacher"},</p>
        <p>We are excited to be working with ${project.school || "your school"} on the upcoming InterACT English project: <strong>${project.name}</strong>.</p>
        ${dateStr ? `<p><strong>Dates:</strong> ${dateStr}</p>` : ""}
        <p>To help us prepare, we need you to add your student lists. Please click the link below to access your project page:</p>
        <p>
          <a href="${schoolPortalUrl}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Set Up Your Class
          </a>
        </p>
        <p style="font-size: 13px; color: #71717a;">This link is unique to you and does not require a login.</p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
        <p style="color: #71717a; font-size: 12px;">InterACT English gGmbH | Planufer 92B, 10967 Berlin | info@interactenglish.de</p>
      </div>
    `,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Update invited timestamp
  await adminClient
    .from("projects")
    .update({ teacher_invited_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
