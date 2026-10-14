import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendSlackAlert } from "@/lib/slack";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

function formatDateDE(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

function buildInfoPackHtml({
  teacherName,
  programType,
  school,
  infoFormUrl,
}: {
  teacherName: string;
  programType: string;
  school: string;
  infoFormUrl: string;
}): string {
  const isNSW = programType.toLowerCase().includes("native speaker");
  const isAiA = programType.toLowerCase().includes("art in action");

  const conditionalBullets: string[] = [];
  if (isNSW) {
    conditionalBullets.push(
      "<li>die Namen der drei Module, f&uuml;r die ihr euch entschieden habt</li>"
    );
  }
  if (isAiA) {
    conditionalBullets.push(
      "<li>ob ihr euch f&uuml;r die analoge oder digitale Variante entschieden habt</li>"
    );
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6;">
      <p>Guten Tag ${teacherName},</p>

      <p>Wir freuen uns sehr auf euer anstehendes Projekt <strong>${programType}</strong> mit euch!</p>

      <p>Im ersten Schritt ben&ouml;tigen wir einige Informationen.<br/>
      Bitte f&uuml;llt dazu das unten verlinkte Info Form aus. Damit dieser Schritt ohne Herausforderungen klappt bitte ich euch vorab zu pr&uuml;fen ob ihr die folgenden Informationen zur Hand habt:</p>

      <ul style="margin: 12px 0; padding-left: 24px;">
        <li>Datum eures Projektes</li>
        <li>die Klassenstufen und Gruppengr&ouml;&szlig;en der Teilnehmer*innen</li>
        <li>die Stundenzeiten der Schule oder die f&uuml;r dieses Projekt gew&auml;hlten Stundenzeiten</li>
        ${conditionalBullets.join("\n        ")}
      </ul>

      <p>Wenn diese Informationen zur Hand sind, k&ouml;nnt ihr im n&auml;chsten Schritt das verlinkte Formular ausf&uuml;llen:</p>

      <p style="text-align: center; margin: 28px 0;">
        <a href="${infoFormUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Info Form ausf&uuml;llen
        </a>
      </p>

      <p>Ihr werdet in eurem Projekt von Nicole begleitet, unsere Projektkoordinatorin f&uuml;r innerschulische Projekte. Sie kommt in den n&auml;chsten 2-3 Wochen auf euch zu mit allen weiteren Informationen.</p>

      <p>Bei Fragen k&ouml;nnt ihr euch aber bereits jetzt jederzeit gern per Antwort auf diese Email bei ihr melden oder telefonisch unter 030 20339702.</p>

      <p>Bei Fragen zum Vertrag oder der Rechnungsstellung wendet euch bitte weiterhin an Luise unter <a href="mailto:connect@interactenglish.de" style="color: #0d9488;">connect@interactenglish.de</a>.</p>

      <p>Wir freuen uns auf eine gute Zusammenarbeit und ein erfolgreiches Projekt.</p>

      <p>Beste Gr&uuml;&szlig;e,<br/>
      das InterACT English Team<br/>
      <span style="color: #71717a;">#GernePerDu</span></p>

      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />

      <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
        InterACT English gGmbH<br/>
        coordination@interactenglish.de<br/>
        Tel. 030 20339702<br/><br/>
        Office address:<br/>
        Gneisenaustra&szlig;e 64, 10961 Berlin<br/><br/>
        Company Information:<br/>
        InterACT English gGmbH<br/>
        Planufer 92B, 10967 Berlin<br/>
        <a href="https://www.interactenglish.de" style="color: #0d9488;">www.interactenglish.de</a>
      </p>
    </div>
  `;
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

  // Fetch project
  const { data: project } = await adminClient
    .from("projects")
    .select(
      "id, name, school, teacher_email, teacher_name, teacher_token, program_type, start_date, end_date"
    )
    .eq("id", id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.teacher_email) {
    return NextResponse.json(
      { error: "No teacher email set for this project" },
      { status: 400 }
    );
  }

  if (!project.teacher_token) {
    return NextResponse.json(
      { error: "No teacher token set — please invite the teacher first" },
      { status: 400 }
    );
  }

  const teacherName = project.teacher_name || "Lehrkraft";
  const programType = project.program_type || "Englischprojekt";
  const school = project.school || "";
  const startDate = project.start_date ? formatDateDE(project.start_date) : "";
  const endDate = project.end_date ? formatDateDE(project.end_date) : "";

  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : "";

  const infoFormUrl = `${APP_URL}/school/project/${project.teacher_token}/info-form`;

  const subject = `InterACT English ${programType}${dateRange ? ` // ${dateRange}` : ""}${school ? ` // ${school}` : ""}`;

  const html = buildInfoPackHtml({
    teacherName,
    programType,
    school,
    infoFormUrl,
  });

  const result = await sendEmail({
    to: project.teacher_email,
    subject,
    html,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Update the project with the sent timestamp
  try {
    await adminClient
      .from("projects")
      .update({ info_pack_email_sent_at: new Date().toISOString() })
      .eq("id", id);
  } catch (err) {
    // Column may not exist yet — log but don't fail
    console.error("[INFO-PACK] Failed to update info_pack_email_sent_at:", err);
  }

  // Slack notification
  await sendSlackAlert({
    type: "info",
    title: "Info Pack Email Sent",
    message: `Info pack email sent to ${teacherName} for ${project.name}`,
    fields: [
      { label: "Teacher", value: teacherName },
      { label: "School", value: school || "-" },
      { label: "Program", value: programType },
    ],
  });

  return NextResponse.json({ success: true });
}
