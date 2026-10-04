import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, workOrderSignedEmailToTA, workOrderSignedEmailToAdmin } from "@/lib/email";
import { notifyWorkOrderEvent } from "@/lib/slack";
import { generateSchoolProfile, generateHomestayProfile, PROFILE_FIELDS } from "@/lib/ta-profile-docs";

export async function POST(
  request: Request,
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

  const body = await request.json();

  // Verify this work order belongs to the TA and is in "sent" status
  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ta_id, status, job_id, project_name, school, school_address, location, program_type, start_date, end_date, days, pdf_url")
    .eq("id", id)
    .eq("ta_id", user.id)
    .eq("status", "sent")
    .single();

  if (!wo) {
    return NextResponse.json({ error: "Work order not found or not signable" }, { status: 404 });
  }

  // Get IP from request headers
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  const pdfUrl = body.pdf_url || null;

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      pdf_url: pdfUrl,
      signature_data: {
        signature_png: body.signature_png,
        signature_type: body.signature_type,
        typed_name: body.typed_name || null,
        timestamp: body.timestamp,
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
      },
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Get TA profile
  const { data: taProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const taName = taProfile
    ? `${taProfile.first_name || ""} ${taProfile.last_name || ""}`.trim() || taProfile.email
    : "Unknown";
  const taEmail = taProfile?.email || "";

  // Fetch signed PDF as attachment if available
  let attachments: Array<{ filename: string; content: Buffer }> | undefined;
  if (pdfUrl) {
    try {
      const pdfRes = await fetch(pdfUrl);
      if (pdfRes.ok) {
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        attachments = [{ filename: `work-order-${wo.project_name}.pdf`, content: pdfBuffer }];
      }
    } catch (err) {
      console.error("[SIGN] Failed to fetch PDF for attachment:", err);
    }
  }

  // Send email to TA with signed PDF attached
  if (taEmail) {
    const taEmailTemplate = workOrderSignedEmailToTA(taName, wo.project_name, wo.school);
    await sendEmail({
      to: taEmail,
      ...taEmailTemplate,
      attachments,
    });
  }

  // Send email to admins
  const adminClient = createAdminClient();
  const { data: admins } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("role", "admin");

  if (admins) {
    const adminEmailTemplate = workOrderSignedEmailToAdmin(taName, wo.project_name, wo.school);
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        ...adminEmailTemplate,
      });
    }
  }

  // Slack notification
  await notifyWorkOrderEvent({
    event: "signed",
    taName,
    projectName: wo.project_name,
    school: wo.school,
  });

  // Log activity
  const { logActivity } = await import("@/lib/activity-log");
  await logActivity({
    jobId: wo.job_id,
    workOrderId: id,
    taId: user.id,
    action: "work_order_signed",
    details: "TA signed the work order",
    performedBy: user.id,
  });

  // Notify admins (in-app notifications)
  const { notifyAdmins } = await import("@/lib/notifications");
  await notifyAdmins({
    type: "work_order_signed",
    title: "Work Order Signed",
    body: `${taName} signed the work order for ${wo.project_name}`,
    payload: { link: `/admin/work-orders/${id}` },
  });

  // Link TA to existing project (created by Monday webhook), or fallback to creating one
  let linkedProjectId: string | null = null;
  try {
    // Try to find an existing project for this work order's job
    let existingProject = null;

    if (wo.job_id) {
      // Look up the job to get its monday_item_id, then find the project
      const { data: job } = await adminClient
        .from("jobs")
        .select("monday_item_id")
        .eq("id", wo.job_id)
        .single();

      if (job?.monday_item_id) {
        const { data: proj } = await adminClient
          .from("projects")
          .select("id")
          .eq("monday_item_id", job.monday_item_id)
          .single();
        existingProject = proj;
      }
    }

    // Also check by work_order_id directly
    if (!existingProject) {
      const { data: proj } = await adminClient
        .from("projects")
        .select("id")
        .eq("work_order_id", id)
        .single();
      existingProject = proj;
    }

    if (existingProject) {
      // Link the TA to the existing project
      await adminClient
        .from("projects")
        .update({
          ta_id: wo.ta_id,
          work_order_id: id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProject.id);

      // Also add to project_tas for multi-TA support (ignore if already exists)
      await adminClient
        .from("project_tas")
        .upsert(
          { project_id: existingProject.id, ta_id: wo.ta_id, role: "ta" },
          { onConflict: "project_id,ta_id", ignoreDuplicates: true }
        );

      linkedProjectId = existingProject.id;
    } else {
      // Fallback: create project if none exists (e.g. deal wasn't tracked in Monday)
      const { data: newProject } = await adminClient
        .from("projects")
        .insert({
          work_order_id: id,
          ta_id: wo.ta_id,
          name: wo.project_name,
          school: wo.school,
          school_address: wo.school_address,
          location: wo.location,
          program_type: wo.program_type,
          start_date: wo.start_date,
          end_date: wo.end_date,
          days: wo.days,
          status: "upcoming",
        })
        .select("id")
        .single();

      if (newProject) {
        // Add TA to project_tas for multi-TA support
        await adminClient
          .from("project_tas")
          .upsert(
            { project_id: newProject.id, ta_id: wo.ta_id, role: "ta" },
            { onConflict: "project_id,ta_id", ignoreDuplicates: true }
          );

        // Copy task templates as project tasks
        const { data: templates } = await adminClient
          .from("project_task_templates")
          .select("title, description, type, url, required, sort_order");

        if (templates && templates.length > 0) {
          await adminClient.from("project_tasks").insert(
            templates.map((t) => ({
              project_id: newProject.id,
              title: t.title,
              description: t.description,
              type: t.type,
              url: t.url,
              required: t.required,
              sort_order: t.sort_order,
            }))
          );
        }

        linkedProjectId = newProject.id;
      }
    }
  } catch (err) {
    console.error("[SIGN] Failed to link/create project:", err);
  }

  // Auto-generate TA profile documents for the project
  if (linkedProjectId) {
    try {
      // Fetch full TA profile
      const { data: fullProfile } = await adminClient
        .from("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", wo.ta_id)
        .single();

      if (fullProfile) {
        const schoolDoc = generateSchoolProfile(fullProfile as unknown as Parameters<typeof generateSchoolProfile>[0]);
        const homestayDoc = generateHomestayProfile(fullProfile as unknown as Parameters<typeof generateHomestayProfile>[0]);

        // Check if profile docs already exist for this TA + project (avoid duplicates)
        const { data: existingDocs } = await adminClient
          .from("project_documents")
          .select("name")
          .eq("project_id", linkedProjectId)
          .in("name", [schoolDoc.name, homestayDoc.name]);

        const existingNames = new Set((existingDocs || []).map((d) => d.name));

        const docsToInsert = [];

        if (!existingNames.has(schoolDoc.name)) {
          docsToInsert.push({
            project_id: linkedProjectId,
            name: schoolDoc.name,
            content: schoolDoc.content,
            doc_type: "native",
            published: true,
            visibility: "both",
            uploaded_by: wo.ta_id,
          });
        }

        if (!existingNames.has(homestayDoc.name)) {
          docsToInsert.push({
            project_id: linkedProjectId,
            name: homestayDoc.name,
            content: homestayDoc.content,
            doc_type: "native",
            published: true,
            visibility: "teacher",
            uploaded_by: wo.ta_id,
          });
        }

        if (docsToInsert.length > 0) {
          await adminClient.from("project_documents").insert(docsToInsert);
        }
      }
    } catch (err) {
      console.error("[SIGN] Failed to generate TA profile documents:", err);
    }
  }

  return NextResponse.json({ success: true });
}
