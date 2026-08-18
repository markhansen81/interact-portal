import { NextResponse } from "next/server";
import { mondayQuery } from "@/lib/monday";
import { createInsightlyLead } from "@/lib/insightly";

const LEADS_BOARD = "6976340556";

export async function POST(request: Request) {
  const data = await request.json();

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
  // Dates: preferred_dates = start date (Von), num_days = end date (Bis) when has_dates=true
  if (data.has_dates === true && data.preferred_dates) {
    const startDate = data.preferred_dates; // YYYY-MM-DD
    const endDate = data.num_days || startDate; // YYYY-MM-DD

    // Preferred dates as text
    columnValues.preferred_dates = `${startDate} - ${endDate}`;

    // Start/End date columns
    columnValues.proposed_start_date = { date: startDate };
    columnValues.proposed_end_date = { date: endDate };

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 0) {
      columnValues.numeric_mktd4bet = String(diffDays);
    }

    // Auto school year: Aug-Dec = current/next, Jan-Jul = prev/current
    const month = start.getMonth();
    const year = start.getFullYear();
    const schoolYear = month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    columnValues.dropdown_mktdk7xc = { labels: [schoolYear] };
  } else if (data.has_dates === false) {
    // "Not sure" flow
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

  // Build description from message + context
  const descParts: string[] = [];
  if (data.message) descParts.push(data.message);
  if (data.has_dates === false) descParts.push(data.locale === "de" ? "Noch kein fester Termin — Beratung gewünscht." : "No fixed dates yet — advice requested.");
  if (descParts.length) {
    columnValues.long_text_mktdx1rj = { text: descParts.join("\n\n") };
  }

  const contactName = `${data.first_name} ${data.last_name}`.trim();
  const itemName = data.school_name ? `${data.school_name} // ${contactName}` : contactName;

  // Also set School Name as a separate column
  if (data.school_name) {
    columnValues.text_mm5ah6a8 = data.school_name;
  }

  const result = await mondayQuery(
    `mutation ($b: ID!, $n: String!, $c: JSON!, $g: String!) {
      create_item(board_id: $b, item_name: $n, column_values: $c, group_id: $g, create_labels_if_missing: true) { id }
    }`,
    { b: LEADS_BOARD, n: itemName, c: JSON.stringify(columnValues), g: "topics" }
  );

  // Also create lead in Insightly
  const descParts2: string[] = [];
  if (data.message) descParts2.push(data.message);
  if (data.school_name) descParts2.push(`School: ${data.school_name}`);
  if (data.programs?.length) descParts2.push(`Programs: ${data.programs.join(", ")}`);
  if (data.grades?.length) descParts2.push(`Grades: ${data.grades.join(", ")}`);
  if (data.num_students) descParts2.push(`Students: ${data.num_students}`);
  if (data.num_groups) descParts2.push(`Groups: ${data.num_groups}`);
  if (data.preferred_dates) descParts2.push(`Dates: ${data.preferred_dates}`);

  await createInsightlyLead({
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
    school_year: data.school_year,
  });

  if (result?.data?.create_item) {
    return NextResponse.json({ ok: true, id: result.data.create_item.id, insightly_key_present: !!process.env.INSIGHTLY_API_KEY });
  }

  return NextResponse.json({ error: "Failed to create lead", details: result }, { status: 500 });
}
