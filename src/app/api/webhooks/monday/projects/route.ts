import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayQuery, extractColumnValue, extractTimelineValue } from "@/lib/monday";

export async function POST(request: Request) {
  const body = await request.json();

  // Monday webhook challenge (verification)
  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  if (!event) {
    return NextResponse.json({ error: "No event" }, { status: 400 });
  }

  const itemId = String(event.pulseId || event.itemId);
  const boardId = String(event.boardId);

  // Only process events from the projects board
  if (boardId !== process.env.MONDAY_PROJECTS_BOARD_ID) {
    return NextResponse.json({ ok: true, skipped: true, reason: "wrong board" });
  }

  // Only process deal_stage column changes
  const columnId = event.columnId;
  if (columnId !== "deal_stage") {
    return NextResponse.json({ ok: true, skipped: true, reason: "wrong column" });
  }

  // Extract the status label text from the event
  // Monday sends status values as JSON: { "label": { "text": "Won" } }
  let labelText = "";
  try {
    const val = typeof event.value === "string" ? JSON.parse(event.value) : event.value;
    labelText = val?.label?.text || val?.label || "";
  } catch {
    // fall through
  }
  // Fallback to textBody if label parsing didn't work
  if (!labelText) {
    labelText = event.textBody || "";
  }

  if (!labelText.startsWith("Won")) {
    return NextResponse.json({ ok: true, skipped: true, reason: "not won" });
  }

  // Fetch the full item from Monday with all columns
  const result = await mondayQuery(`
    query ($itemId: [ID!]) {
      items(ids: $itemId) {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  `, { itemId: [itemId] });

  const item = result?.data?.items?.[0];
  if (!item) {
    return NextResponse.json({ error: "Item not found on Monday" }, { status: 404 });
  }

  // Map Monday columns to project fields
  const school = extractColumnValue(item, "opp_school_name");
  const street = extractColumnValue(item, "opp_street");
  const postcode = extractColumnValue(item, "opp_postcode");
  const city = extractColumnValue(item, "opp_city");
  const schoolAddress = [street, postcode, city].filter(Boolean).join(", ");
  const location = extractColumnValue(item, "opp_state");
  const programType = extractColumnValue(item, "opp_program_type");
  const daysStr = extractColumnValue(item, "opp_num_days");
  const days = parseInt(daysStr) || null;

  // Try timeline columns for dates
  const timeline =
    extractTimelineValue(item, "project_timeline") ||
    extractTimelineValue(item, "timeline") ||
    extractTimelineValue(item, "date__1");

  // Teacher / contact fields
  const teacherEmail = extractColumnValue(item, "opp_email") || null;
  const teacherName = extractColumnValue(item, "opp_primary_contact") || null;
  const teacherPhone = extractColumnValue(item, "opp_phone") || null;

  const projectData = {
    name: item.name,
    school: school || null,
    school_address: schoolAddress || null,
    location: location || null,
    program_type: programType || null,
    days,
    start_date: timeline?.start || null,
    end_date: timeline?.end || null,
    monday_item_id: itemId,
    monday_board_id: boardId,
    status: "upcoming",
    updated_at: new Date().toISOString(),
    teacher_email: teacherEmail,
    teacher_name: teacherName,
    teacher_phone: teacherPhone,
    teacher_token: crypto.randomUUID(),
  };

  const adminClient = createAdminClient();

  // Upsert: check if project with this monday_item_id already exists
  const { data: existingProject } = await adminClient
    .from("projects")
    .select("id")
    .eq("monday_item_id", itemId)
    .single();

  let projectId: string;
  let isNew = false;

  if (existingProject) {
    await adminClient
      .from("projects")
      .update(projectData)
      .eq("id", existingProject.id);
    projectId = existingProject.id;
  } else {
    const { data: newProject, error } = await adminClient
      .from("projects")
      .insert(projectData)
      .select("id")
      .single();

    if (error || !newProject) {
      console.error("[WEBHOOK/PROJECTS] Failed to create project:", error);
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }

    projectId = newProject.id;
    isNew = true;
  }

  // Only create tasks and documents for new projects
  if (isNew) {
    // Copy task templates as project tasks
    const { data: templates } = await adminClient
      .from("project_task_templates")
      .select("title, description, type, url, required, sort_order");

    if (templates && templates.length > 0) {
      await adminClient.from("project_tasks").insert(
        templates.map((t) => ({
          project_id: projectId,
          title: t.title,
          description: t.description,
          type: t.type,
          url: t.url,
          required: t.required,
          sort_order: t.sort_order,
        }))
      );
    }

    // Auto-generate template documents
    const gradeLevel = extractColumnValue(item, "opp_grade_level") || extractColumnValue(item, "grade_level") || "";
    const numStudents = extractColumnValue(item, "opp_num_students") || extractColumnValue(item, "num_students") || "";
    const numGroups = extractColumnValue(item, "opp_num_groups") || extractColumnValue(item, "num_groups") || "";
    const accommodation = extractColumnValue(item, "opp_accommodation") || extractColumnValue(item, "accommodation") || "";
    const specialConditions = extractColumnValue(item, "opp_special_conditions") || extractColumnValue(item, "special_conditions") || extractColumnValue(item, "long_text__1") || "";

    const dateRange = timeline
      ? `${timeline.start} to ${timeline.end}`
      : "TBD";

    // Project Info Sheet
    const infoSheetContent = `<h1>Project Info Sheet</h1>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:200px;">School</td><td style="padding:8px;border:1px solid #ddd;">${school || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Address</td><td style="padding:8px;border:1px solid #ddd;">${schoolAddress || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Location / State</td><td style="padding:8px;border:1px solid #ddd;">${location || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Program Type</td><td style="padding:8px;border:1px solid #ddd;">${programType || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Dates</td><td style="padding:8px;border:1px solid #ddd;">${dateRange}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Days</td><td style="padding:8px;border:1px solid #ddd;">${days || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Grade Level</td><td style="padding:8px;border:1px solid #ddd;">${gradeLevel || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Number of Students</td><td style="padding:8px;border:1px solid #ddd;">${numStudents || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Groups</td><td style="padding:8px;border:1px solid #ddd;">${numGroups || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Accommodation</td><td style="padding:8px;border:1px solid #ddd;">${accommodation || "TBD"}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Special Conditions</td><td style="padding:8px;border:1px solid #ddd;">${specialConditions || "None"}</td></tr>
</table>
<br/>
<h2>Additional Notes</h2>
<p><em>Add any additional project notes here...</em></p>`;

    // Schedule Template
    const scheduleContent = `<h1>Schedule</h1>
<p><strong>${item.name}</strong> &mdash; ${school || "TBD"}</p>
<p>${dateRange}</p>
<br/>
<table style="width:100%;border-collapse:collapse;">
  <tr>
    <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;"></th>
    <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Monday</th>
    <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Tuesday</th>
    <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Wednesday</th>
    <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Thursday</th>
    <th style="padding:8px;border:1px solid #ddd;background:#f5f5f5;">Friday</th>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">AM</td>
    <td style="padding:8px;border:1px solid #ddd;min-height:60px;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">PM</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
    <td style="padding:8px;border:1px solid #ddd;">&nbsp;</td>
  </tr>
</table>
<br/>
<p><em>Fill in the schedule details above. This will be shared with the TA once published.</em></p>`;

    await adminClient.from("project_documents").insert([
      {
        project_id: projectId,
        name: "Project Info Sheet",
        description: "Pre-filled project information for the TA",
        content: infoSheetContent,
        doc_type: "native",
        published: false,
      },
      {
        project_id: projectId,
        name: "Schedule Template",
        description: "Weekly schedule template (Mon-Fri, AM/PM)",
        content: scheduleContent,
        doc_type: "native",
        published: false,
      },
    ]);

    // Auto-attach template documents
    const { data: docTemplates } = await adminClient
      .from("document_templates")
      .select("name, doc_type, file_url, content, visibility")
      .eq("auto_attach", true);

    if (docTemplates && docTemplates.length > 0) {
      await adminClient.from("project_documents").insert(
        docTemplates.map((t) => ({
          project_id: projectId,
          name: t.name,
          doc_type: t.doc_type,
          file_url: t.file_url || null,
          content: t.content || null,
          published: true,
          visibility: t.visibility || "both",
        }))
      );
    }
  }

  console.log(`[WEBHOOK/PROJECTS] Project ${isNew ? "created" : "updated"}: ${projectId} (Monday item ${itemId})`);

  return NextResponse.json({
    ok: true,
    projectId,
    action: isNew ? "created" : "updated",
  });
}
