import { NextResponse } from "next/server";
import { mondayQuery } from "@/lib/monday";
import { createInsightlyLead } from "@/lib/insightly";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewLead } from "@/lib/slack";
import { addToMailchimp } from "@/lib/mailchimp";
import { sendEmail, newLeadEmail } from "@/lib/email";

const LEADS_BOARD = "6976340556";

export async function POST(request: Request) {
  const data = await request.json();
  const adminClient = createAdminClient();

  // 1. Save to Supabase FIRST — this is our safety net
  const { data: savedLead, error: saveError } = await adminClient
    .from("leads")
    .insert({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email || null,
      phone: data.phone || null,
      roles: data.roles || [],
      school_name: data.school_name || null,
      street: data.street || null,
      postcode: data.postcode || null,
      city: data.city || null,
      state: data.state || null,
      school_type: data.school_type || null,
      programs: data.programs || [],
      grades: data.grades || [],
      num_students: data.num_students || null,
      num_groups: data.num_groups || null,
      school_year: data.school_year || null,
      preferred_dates: data.preferred_dates || null,
      has_dates: data.has_dates ?? null,
      lead_source: data.lead_source || null,
      message: data.message || null,
      newsletter: data.newsletter || false,
      locale: data.locale || null,
      raw_payload: data,
    })
    .select("id")
    .single();

  if (saveError) {
    console.error("[LEAD] Supabase save failed:", saveError);
  }

  const leadId = savedLead?.id;

  // 2. Build Monday column values
  const columnValues: Record<string, unknown> = {
    lead_company: `${data.first_name} ${data.last_name}`.trim(),
    contact_first_name: data.first_name,
    contact_last_name: data.last_name,
    lead_email: { email: data.email, text: data.email },
    lead_status: { label: "New Lead" },
  };

  if (data.phone) {
    columnValues.lead_phone = { phone: data.phone.replace(/[^\d+]/g, ""), countryShortName: "DE" };
  }
  if (data.roles?.length) {
    columnValues.dropdown_mktcc3f9 = { labels: data.roles };
  }
  if (data.street) {
    columnValues.text_mm26h7f1 = data.street;
  }
  if (data.postcode) {
    columnValues.lead_postcode = data.postcode;
  }
  if (data.city) {
    columnValues.lead_city = data.city;
  }
  if (data.state) {
    columnValues.lead_bundesland = { labels: [data.state] };
  }
  if (data.school_type) {
    columnValues.dropdown_mktdrcn0 = { labels: [data.school_type] };
  }
  if (data.programs?.length) {
    columnValues.dropdown_mktdq9nn = { labels: data.programs };
  }
  if (data.grades?.length) {
    columnValues.dropdown_mktdrem4 = { labels: data.grades };
  }
  if (data.num_students) {
    columnValues.numeric_mktd9yve = data.num_students;
  }
  if (data.num_groups) {
    columnValues.numeric_mktdm7w5 = data.num_groups;
  }
  if (data.has_dates === true && data.preferred_dates) {
    const startDate = data.preferred_dates;
    const endDate = data.num_days || startDate;
    columnValues.preferred_dates = `${startDate} - ${endDate}`;
    columnValues.proposed_start_date = { date: startDate };
    columnValues.proposed_end_date = { date: endDate };
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 0) {
      columnValues.numeric_mktd4bet = String(diffDays);
    }
    const month = start.getMonth();
    const year = start.getFullYear();
    const schoolYear = month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    columnValues.dropdown_mktdk7xc = { labels: [schoolYear] };
  } else if (data.has_dates === false) {
    if (data.preferred_dates) {
      columnValues.preferred_dates = data.preferred_dates;
    }
    if (data.school_year) {
      columnValues.dropdown_mktdk7xc = { labels: [data.school_year] };
    }
  }
  if (data.lead_source) {
    columnValues.dropdown_mktdmbbk = { labels: [data.lead_source] };
  }
  if (data.newsletter) {
    columnValues.dropdown_mktd7dhm = { labels: [data.locale === "de" ? "Ja" : "Yes"] };
  }

  const descParts: string[] = [];
  if (data.message) descParts.push(data.message);
  if (data.has_dates === false) descParts.push(data.locale === "de" ? "Noch kein fester Termin — Beratung gewünscht." : "No fixed dates yet — advice requested.");
  if (descParts.length) {
    columnValues.long_text_mktdx1rj = { text: descParts.join("\n\n") };
  }

  const contactName = `${data.first_name} ${data.last_name}`.trim();
  const itemName = data.school_name ? `${data.school_name} // ${contactName}` : contactName;

  if (data.school_name) {
    columnValues.text_mm5ah6a8 = data.school_name;
  }

  // 3. Build Insightly description
  const descParts2: string[] = [];
  if (data.message) descParts2.push(data.message);
  if (data.school_name) descParts2.push(`School: ${data.school_name}`);
  if (data.programs?.length) descParts2.push(`Programs: ${data.programs.join(", ")}`);
  if (data.grades?.length) descParts2.push(`Grades: ${data.grades.join(", ")}`);
  if (data.num_students) descParts2.push(`Students: ${data.num_students}`);
  if (data.num_groups) descParts2.push(`Groups: ${data.num_groups}`);
  if (data.preferred_dates) descParts2.push(`Dates: ${data.preferred_dates}`);

  // 4. Run Monday, Insightly, and Mailchimp in parallel
  const [mondayResult, insightlyResult, mailchimpResult] = await Promise.all([
    mondayQuery(
      `mutation ($b: ID!, $n: String!, $c: JSON!, $g: String!) {
        create_item(board_id: $b, item_name: $n, column_values: $c, group_id: $g, create_labels_if_missing: true) { id }
      }`,
      { b: LEADS_BOARD, n: itemName, c: JSON.stringify(columnValues), g: "topics" }
    ).catch((err) => {
      console.error("[LEAD] Monday error:", err);
      return null;
    }),
    createInsightlyLead({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email,
      phone: data.phone,
      organisation_name: data.school_name,
      title: data.roles?.join(", "),
      street: data.street,
      city: data.city,
      state: data.state,
      postcode: data.postcode,
      description: descParts2.join("\n"),
      lead_source: data.lead_source || "Web",
      school_type: data.school_type,
      programs: data.programs,
      grades: data.grades,
      num_students: data.num_students,
      num_groups: data.num_groups,
      school_year: data.school_year || (data.has_dates === true && data.preferred_dates ? (() => {
        const s = new Date(data.preferred_dates);
        const m = s.getMonth();
        const y = s.getFullYear();
        return m >= 7 ? `${y}/${y+1}` : `${y-1}/${y}`;
      })() : undefined),
      proposed_start: data.has_dates === true ? data.preferred_dates : undefined,
      proposed_end: data.has_dates === true ? (data.num_days || data.preferred_dates) : undefined,
      num_days: data.has_dates === true && data.preferred_dates ? (() => {
        const s = new Date(data.preferred_dates);
        const e = new Date(data.num_days || data.preferred_dates);
        return Math.ceil((e.getTime() - s.getTime()) / (1000*60*60*24)) + 1;
      })() : undefined,
    }).catch((err) => {
      console.error("[LEAD] Insightly error:", err);
      return null;
    }),
    // Mailchimp — only if newsletter checked
    data.newsletter
      ? addToMailchimp({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          school_name: data.school_name,
          state: data.state,
        }).catch((err) => {
          console.error("[LEAD] Mailchimp error:", err);
          return null;
        })
      : Promise.resolve(null),
    // Email to sales team
    (() => {
      const contactName = `${data.first_name} ${data.last_name}`.trim();
      const { subject, html } = newLeadEmail({
        name: contactName,
        email: data.email,
        phone: data.phone,
        school: data.school_name,
        state: data.state,
        programs: data.programs,
        grades: data.grades,
        num_students: data.num_students,
        num_groups: data.num_groups,
        school_year: data.school_year,
        preferred_dates: data.preferred_dates,
        message: data.message,
      });
      return sendEmail({ to: "connect@interactenglish.de", subject, html });
    })().catch((err) => {
      console.error("[LEAD] Email error:", err);
      return null;
    }),
  ]);

  // 5. Update Supabase with sync status
  const mondayItemId = mondayResult?.data?.create_item?.id || null;
  const insightlyLeadId = insightlyResult?.LEAD_ID || null;

  if (leadId) {
    await adminClient
      .from("leads")
      .update({
        monday_item_id: mondayItemId ? String(mondayItemId) : null,
        insightly_lead_id: insightlyLeadId ? String(insightlyLeadId) : null,
        monday_ok: !!mondayItemId,
        insightly_ok: !!insightlyLeadId,
      })
      .eq("id", leadId);
  }

  // 6. Notify Slack
  await notifyNewLead({
    name: `${data.first_name} ${data.last_name}`.trim(),
    email: data.email,
    school: data.school_name,
    programs: data.programs,
    state: data.state,
    mondayOk: !!mondayItemId,
    insightlyOk: !!insightlyLeadId,
  });

  return NextResponse.json({
    ok: true,
    id: mondayItemId,
    insightly: insightlyLeadId ? "ok" : "failed",
    monday: mondayItemId ? "ok" : "failed",
    saved: !!leadId,
  });
}
