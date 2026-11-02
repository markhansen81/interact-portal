import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { teacher_email, teacher_name } = body;

  if (!teacher_email) return NextResponse.json({ error: "teacher_email required" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: job } = await adminClient
    .from("jobs")
    .select("title, school, start_date, end_date, program_type")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Generate a simple token for the teacher portal (future use)
  const token = crypto.randomUUID();
  const portalUrl = `${APP_URL}/teacher/${id}?token=${token}`;

  await adminClient.from("jobs").update({
    teacher_email,
    teacher_name: teacher_name || null,
    teacher_invited_at: new Date().toISOString(),
  }).eq("id", id);

  // Send invite email
  const teacherDisplay = teacher_name || teacher_email;
  const dateStr = job.start_date
    ? new Date(job.start_date).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
    : "TBD";

  await sendEmail({
    to: teacher_email,
    subject: `InterACT — Projektinformationen: ${job.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
        <div style="background: #E91E8C; padding: 24px 32px;">
          <span style="color: white; font-size: 20px; font-weight: bold;">InterACT English</span>
        </div>
        <div style="padding: 32px;">
          <p>Liebe/r ${teacherDisplay},</p>
          <p>Vielen Dank für Ihr Interesse an unserem Programm <strong>${job.program_type || job.title}</strong>.</p>
          <p>Wir freuen uns, mit Ihnen zusammenzuarbeiten. Damit wir alles optimal vorbereiten können, bitten wir Sie, das Projektvformular auszufüllen:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${portalUrl}" style="background: #E91E8C; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: bold;">
              Projektformular öffnen →
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Projektstart: <strong>${dateStr}</strong><br>Schule: <strong>${job.school || job.title}</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">InterACT English GmbH — Bei Fragen erreichen Sie uns unter info@interactenglish.de</p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
