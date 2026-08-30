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
  school_type?: string;
  programs?: string[];
  grades?: string[];
  num_students?: string;
  num_groups?: string;
  school_year?: string;
  proposed_start?: string;
  proposed_end?: string;
  num_days?: number;
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

  // Match old website custom fields exactly
  if (data.email) {
    customFields.push({ FIELD_NAME: "Client_email_1__c", FIELD_VALUE: data.email });
  }
  const contactName = `${data.first_name} ${data.last_name}`.trim();
  if (contactName) {
    customFields.push({ FIELD_NAME: "Primary_Contact_1_1__c", FIELD_VALUE: contactName });
  }
  if (data.phone) {
    customFields.push({ FIELD_NAME: "Primary_Contact_Phone__c", FIELD_VALUE: data.phone });
  }
  if (data.organisation_name) {
    customFields.push({ FIELD_NAME: "School_Name__c", FIELD_VALUE: data.organisation_name });
  }
  if (data.street || data.postcode || data.city) {
    const fullAddress = [data.street, [data.postcode, data.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    customFields.push({ FIELD_NAME: "School_Address__c", FIELD_VALUE: fullAddress });
  }
  if (data.school_type) {
    customFields.push({ FIELD_NAME: "School_Type_1__c", FIELD_VALUE: data.school_type });
    customFields.push({ FIELD_NAME: "Organization_type_dropdown_1_1__c", FIELD_VALUE: data.school_type });
  }
  if (data.programs?.length) {
    customFields.push({ FIELD_NAME: "Programes_interested_in__c", FIELD_VALUE: data.programs.join(", ") });
  }
  if (data.grades?.length) {
    customFields.push({ FIELD_NAME: "OPPORTUNITY_FIELD_1__c", FIELD_VALUE: data.grades.join(", ") });
  }
  if (data.num_students) {
    customFields.push({ FIELD_NAME: "Estimated_Number_of_Participants__c", FIELD_VALUE: Number(data.num_students) });
  }
  if (data.num_groups) {
    customFields.push({ FIELD_NAME: "Estimated_Number_of_Participants_2_1__c", FIELD_VALUE: Number(data.num_groups) });
  }
  if (data.school_year) {
    // Insightly expects "2026 / 2027" format (spaces around slash)
    const formattedYear = data.school_year.replace(/\s*\/\s*/, " / ");
    customFields.push({ FIELD_NAME: "School_Year__c", FIELD_VALUE: formattedYear });
  }
  if (data.proposed_start) {
    customFields.push({ FIELD_NAME: "Proposed_dates_project__c", FIELD_VALUE: data.proposed_start });
    customFields.push({ FIELD_NAME: "Prosposed_start_date_1__c", FIELD_VALUE: data.proposed_start });
  }
  if (data.proposed_end) {
    customFields.push({ FIELD_NAME: "Proposed_end_date__c", FIELD_VALUE: data.proposed_end });
  }
  if (data.num_days && data.num_days > 0 && data.num_days <= 7) {
    customFields.push({ FIELD_NAME: "Number_of_project_days_1__c", FIELD_VALUE: `${data.num_days} Day${data.num_days > 1 ? "s" : ""}` });
  }
  customFields.push({ FIELD_NAME: "New_or_returning_Client__c", FIELD_VALUE: "New Client" });

  lead.CUSTOMFIELDS = customFields;

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        console.error(`[INSIGHTLY] Failed to create lead (attempt ${attempt}/${maxAttempts}):`, res.status, error);
        if (attempt < maxAttempts && res.status >= 500) continue;
        return null;
      }

      const result = await res.json();
      console.log("[INSIGHTLY] Lead created:", result.LEAD_ID);
      return result;
    } catch (error) {
      console.error(`[INSIGHTLY] Error (attempt ${attempt}/${maxAttempts}):`, error);
      if (attempt < maxAttempts) continue;
      return null;
    }
  }
  return null;
}
