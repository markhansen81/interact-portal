import { NextResponse } from "next/server";
import { mondayQuery } from "@/lib/monday";

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
  if (data.num_days) {
    columnValues.numeric_mktd4bet = data.num_days;
  }
  if (data.preferred_dates) {
    columnValues.preferred_dates = data.preferred_dates;
  }
  if (data.school_year) {
    columnValues.dropdown_mktdk7xc = { labels: [data.school_year] };
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

  const itemName = data.school_name || `${data.first_name} ${data.last_name}`;

  const result = await mondayQuery(
    `mutation ($b: ID!, $n: String!, $c: JSON!, $g: String!) {
      create_item(board_id: $b, item_name: $n, column_values: $c, group_id: $g, create_labels_if_missing: true) { id }
    }`,
    { b: LEADS_BOARD, n: itemName, c: JSON.stringify(columnValues), g: "topics" }
  );

  if (result?.data?.create_item) {
    return NextResponse.json({ ok: true, id: result.data.create_item.id });
  }

  return NextResponse.json({ error: "Failed to create lead", details: result }, { status: 500 });
}
