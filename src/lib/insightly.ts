const INSIGHTLY_API_URL = "https://api.insightly.com/v3.1";

// Lead source IDs
const LEAD_SOURCES: Record<string, number> = {
  Web: 878385,
  Referral: 3221134,
  "B2B Partners": 3221135,
  "Professional Development Workshop": 2668702,
  "Social Media": 2996253,
  "Tradeshow Event": 2809480,
  "Flyer / Brochure": 2809479,
  Unknown: 2809481,
};

// New lead = NotContacted
const NEW_LEAD_STATUS_ID = 870351;

function getAuthHeader(): string {
  const key = process.env.INSIGHTLY_API_KEY;
  if (!key) return "";
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function createInsightlyLead(data: {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  organisation_name?: string;
  title?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  description?: string;
  lead_source?: string;
}) {
  const auth = getAuthHeader();
  if (!auth) {
    console.warn("[INSIGHTLY] No API key configured, skipping");
    return null;
  }

  const lead: Record<string, unknown> = {
    FIRST_NAME: data.first_name,
    LAST_NAME: data.last_name,
    LEAD_STATUS_ID: NEW_LEAD_STATUS_ID,
    ADDRESS_COUNTRY: "Germany",
  };

  if (data.email) lead.EMAIL = data.email;
  if (data.phone) lead.PHONE = data.phone;
  if (data.organisation_name) lead.ORGANISATION_NAME = data.organisation_name;
  if (data.title) lead.TITLE = data.title;
  if (data.street) lead.ADDRESS_STREET = data.street;
  if (data.city) lead.ADDRESS_CITY = data.city;
  if (data.state) lead.ADDRESS_STATE = data.state.toUpperCase();
  if (data.postcode) lead.ADDRESS_POSTCODE = data.postcode;
  if (data.description) lead.LEAD_DESCRIPTION = data.description;

  // Map lead source string to ID
  const sourceId = LEAD_SOURCES[data.lead_source || "Web"] || LEAD_SOURCES.Web;
  lead.LEAD_SOURCE_ID = sourceId;

  // Custom fields — match existing Insightly patterns
  const customFields: Array<{ FIELD_NAME: string; FIELD_VALUE: unknown }> = [];
  const source = data.lead_source || "Web";
  customFields.push({ FIELD_NAME: "LEAD_SOURCE__c", FIELD_VALUE: source });
  customFields.push({ FIELD_NAME: "LEAD__OPP_SOURCE__c", FIELD_VALUE: source });

  if (data.state) {
    const stateUpper = data.state.toUpperCase();
    customFields.push({ FIELD_NAME: "State__c", FIELD_VALUE: stateUpper });
    customFields.push({ FIELD_NAME: "LEAD_FIELD_1", FIELD_VALUE: stateUpper });
    customFields.push({ FIELD_NAME: "LEAD_FIELD_1_1_1_1_1_1__c", FIELD_VALUE: stateUpper });
  }

  lead.CUSTOMFIELDS = customFields;

  try {
    const res = await fetch(`${INSIGHTLY_API_URL}/Leads`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lead),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[INSIGHTLY] Failed to create lead:", res.status, error);
      return null;
    }

    const result = await res.json();
    console.log("[INSIGHTLY] Lead created:", result.LEAD_ID);
    return result;
  } catch (error) {
    console.error("[INSIGHTLY] Error:", error);
    return null;
  }
}
