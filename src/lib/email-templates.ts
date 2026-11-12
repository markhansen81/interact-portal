import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// --- Variable rendering ---

// Variables that are intentionally pre-built HTML fragments (admin-controlled, not user input)
const HTML_SAFE_VARS = new Set(["LEAD_TABLE"]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    const value = vars[key] ?? "";
    return HTML_SAFE_VARS.has(key) ? value : escapeHtml(value);
  });
}

// --- DB access ---

export async function getDbTemplate(id: string): Promise<{ subject: string; html_body: string } | null> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("email_templates")
      .select("subject, html_body")
      .eq("id", id)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

// --- DB-first send ---

export async function sendTemplatedEmail({
  templateId,
  vars,
  fallback,
  to,
  cc,
  attachments,
}: {
  templateId: string;
  vars: Record<string, string>;
  fallback: { subject: string; html: string };
  to: string;
  cc?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}) {
  const dbTemplate = await getDbTemplate(templateId);
  let subject: string, html: string;

  if (dbTemplate) {
    subject = renderVars(dbTemplate.subject, vars);
    html = renderVars(dbTemplate.html_body, vars);
  } else {
    subject = fallback.subject;
    html = fallback.html;
  }

  return sendEmail({ to, cc, subject, html, attachments });
}

// --- Template defaults with {{VAR}} placeholders ---

export interface TemplateVar {
  key: string;
  description: string;
}

export interface TemplateDefault {
  subject: string;
  html_body: string;
  variables: TemplateVar[];
}

export const templateDefaults: Record<string, TemplateDefault> = {
  "work-order-sent": {
    subject: "New Work Order: {{PROJECT_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">New Work Order</h2>
  <p>Hi {{TA_NAME}},</p>
  <p>You have a new work order for <strong>{{PROJECT_NAME}}</strong> waiting for your signature.</p>
  <p><a href="{{WO_URL}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View &amp; Sign Work Order</a></p>
  <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "PROJECT_NAME", description: "Project name" },
      { key: "WO_URL", description: "Link to the work order" },
    ],
  },

  "invoice-submitted": {
    subject: "Invoice {{INVOICE_NUMBER}} submitted by {{TA_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">Invoice Submitted</h2>
  <p><strong>{{TA_NAME}}</strong> has submitted invoice <strong>{{INVOICE_NUMBER}}</strong> for <strong>€{{TOTAL}}</strong>.</p>
  <p><a href="{{PORTAL_URL}}/admin/invoices" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Review Invoice</a></p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "INVOICE_NUMBER", description: "Invoice number (e.g. RE-2026-042)" },
      { key: "TOTAL", description: "Invoice total amount" },
      { key: "PORTAL_URL", description: "Portal base URL" },
    ],
  },

  "document-expiring": {
    subject: "Document expiring soon: {{DOC_TYPE}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #b45309;">Document Expiring Soon</h2>
  <p>Hi {{TA_NAME}},</p>
  <p>Your <strong>{{DOC_TYPE}}</strong> expires on <strong>{{EXPIRY_DATE}}</strong>.</p>
  <p>Please upload a renewed document as soon as possible.</p>
  <p><a href="{{PORTAL_URL}}/portal/documents" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Update Documents</a></p>
  <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "DOC_TYPE", description: "Document type (e.g. Police Check)" },
      { key: "EXPIRY_DATE", description: "Expiry date" },
      { key: "PORTAL_URL", description: "Portal base URL" },
    ],
  },

  "nudge": {
    subject: "Reminder: {{ITEM}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">Reminder</h2>
  <p>Hi {{TA_NAME}},</p>
  <p>{{MESSAGE}}</p>
  <p><a href="{{URL}}" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">{{BTN_LABEL}}</a></p>
  <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "ITEM", description: "Item title (used in subject)" },
      { key: "MESSAGE", description: "Reminder message body" },
      { key: "URL", description: "Link URL" },
      { key: "BTN_LABEL", description: "Button label text" },
    ],
  },

  "new-message": {
    subject: "New message from {{SENDER_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">New Message</h2>
  <p>Hi {{RECIPIENT_NAME}},</p>
  <p>You have a new message from <strong>{{SENDER_NAME}}</strong>.</p>
  <p><a href="{{PORTAL_URL}}/portal/messages" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Read Message</a></p>
  <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
</div>`,
    variables: [
      { key: "RECIPIENT_NAME", description: "Recipient's name" },
      { key: "SENDER_NAME", description: "Sender's name" },
      { key: "PORTAL_URL", description: "Portal base URL" },
    ],
  },

  "new-lead": {
    subject: "New Lead: {{SCHOOL_OR_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">New Lead Inquiry</h2>
  {{LEAD_TABLE}}
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
  <p style="color: #71717a; font-size: 12px;">This lead was submitted via the InterACT Portal contact form.</p>
</div>`,
    variables: [
      { key: "SCHOOL_OR_NAME", description: "School name or contact name (for subject)" },
      { key: "LEAD_TABLE", description: "Auto-generated HTML table of lead details" },
    ],
  },

  "wo-signed-ta": {
    subject: "Work Order Signed: {{PROJECT_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">Work Order Signed</h2>
  <p>Hi {{TA_NAME}},</p>
  <p>Your work order for <strong>{{PROJECT_NAME}}</strong> at <strong>{{SCHOOL_NAME}}</strong> has been signed successfully.</p>
  <p>Your signed document is attached to this email.</p>
  <p><a href="{{PORTAL_URL}}/portal/work-orders" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Work Orders</a></p>
  <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "PROJECT_NAME", description: "Project name" },
      { key: "SCHOOL_NAME", description: "School name" },
      { key: "PORTAL_URL", description: "Portal base URL" },
    ],
  },

  "wo-signed-admin": {
    subject: "Work Order Signed: {{TA_NAME}} — {{PROJECT_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">Work Order Signed</h2>
  <p><strong>{{TA_NAME}}</strong> has signed the work order for <strong>{{PROJECT_NAME}}</strong> at <strong>{{SCHOOL_NAME}}</strong>.</p>
  <p><a href="{{PORTAL_URL}}/admin/work-orders" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Work Orders</a></p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "PROJECT_NAME", description: "Project name" },
      { key: "SCHOOL_NAME", description: "School name" },
      { key: "PORTAL_URL", description: "Portal base URL" },
    ],
  },

  "wo-declined": {
    subject: "Work Order Declined: {{TA_NAME}} — {{PROJECT_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">Work Order Declined</h2>
  <p><strong>{{TA_NAME}}</strong> has declined the work order for <strong>{{PROJECT_NAME}}</strong> at <strong>{{SCHOOL_NAME}}</strong>.</p>
  <p><strong>Reason:</strong> {{REASON}}</p>
  <p><a href="{{PORTAL_URL}}/admin/work-orders" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Work Orders</a></p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "PROJECT_NAME", description: "Project name" },
      { key: "SCHOOL_NAME", description: "School name" },
      { key: "REASON", description: "Decline reason (may be empty)" },
      { key: "PORTAL_URL", description: "Portal base URL" },
    ],
  },

  "school-invoice": {
    subject: "Rechnung {{INVOICE_NUMBER}} — InterACT English",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">Rechnung {{INVOICE_NUMBER}}</h2>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>anbei erhalten Sie die Rechnung <strong>{{INVOICE_NUMBER}}</strong> für das Englischprojekt an der <strong>{{SCHOOL_NAME}}</strong>.</p>
  <table style="width: 100%; font-size: 14px; margin: 16px 0;">
    <tr><td style="color: #71717a; padding: 4px 0;">Rechnungsnummer:</td><td style="font-weight: bold;">{{INVOICE_NUMBER}}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">Gesamtbetrag:</td><td style="font-weight: bold;">{{TOTAL}}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">Fällig bis:</td><td style="font-weight: bold;">{{DUE_DATE}}</td></tr>
  </table>
  <p>Bitte überweisen Sie den Rechnungsbetrag bis zum <strong>{{DUE_DATE}}</strong> auf das in der Rechnung angegebene Konto. Geben Sie als Verwendungszweck bitte die Rechnungsnummer und den Namen Ihrer Schule an.</p>
  <p>Die Rechnung finden Sie als PDF im Anhang dieser E-Mail.</p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
  <p style="color: #71717a; font-size: 12px;">InterACT English gGmbH | Planufer 92B, 10967 Berlin | justin@interactenglish.de | Tel. 030 20 33 9702</p>
</div>`,
    variables: [
      { key: "INVOICE_NUMBER", description: "Invoice number" },
      { key: "SCHOOL_NAME", description: "School name" },
      { key: "TOTAL", description: "Total amount (formatted, e.g. €4.500,00)" },
      { key: "DUE_DATE", description: "Payment due date" },
    ],
  },

  "wo-cancelled": {
    subject: "Work Order Cancelled: {{PROJECT_NAME}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">Work Order Cancelled</h2>
  <p>Hi {{TA_NAME}},</p>
  <p>Your work order for <strong>{{PROJECT_NAME}}</strong> has been cancelled.</p>
  <p><strong>Reason:</strong> {{REASON}}</p>
  <p>If you have questions, please contact us through the portal.</p>
  <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
</div>`,
    variables: [
      { key: "TA_NAME", description: "Teaching artist's name" },
      { key: "PROJECT_NAME", description: "Project name" },
      { key: "REASON", description: "Cancellation reason (may be empty)" },
    ],
  },

  "insurance-confirmation": {
    subject: "Ihre Bestellung: Projektversicherung #{{ORDER_NUMBER}} - {{PRODUCT_NAME}} // {{TOTAL}}",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #18181b;">Projektversicherung – Bestellbestätigung</h2>
  <p>Hallo {{CUSTOMER_NAME}},</p>
  <p>vielen Dank für den Abschluss der Projektversicherung für <strong>{{STUDENT_NAME}}</strong> ({{SCHOOL_NAME}}). Anbei finden Sie Ihre Rechnung, unsere AGB sowie Informationen zur Erstattung als PDF.</p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
  <table style="width: 100%; font-size: 14px;">
    <tr><td style="color: #71717a; padding: 4px 0;">Bestellnummer:</td><td style="font-weight: bold;">#{{ORDER_NUMBER}}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">Versicherung:</td><td>{{PRODUCT_NAME}}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">Versicherte Person:</td><td>{{STUDENT_NAME}}</td></tr>
    <tr><td style="color: #71717a; padding: 4px 0;">Gesamt:</td><td style="font-weight: bold;">{{TOTAL}}</td></tr>
  </table>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
  <p style="font-size: 13px;">Im Falle einer Abwesenheit können Sie Ihren <strong>Erstattungsantrag</strong> innerhalb von 14 Tagen nach Projektende einreichen unter: <a href="https://interactenglish.de/erstattungsantrag">interactenglish.de/erstattungsantrag</a></p>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
  <p style="color: #71717a; font-size: 12px;">InterACT English gGmbH | Planufer 92B, 10967 Berlin | info@interactenglish.de</p>
</div>`,
    variables: [
      { key: "CUSTOMER_NAME", description: "Parent/customer name" },
      { key: "ORDER_NUMBER", description: "Insurance order number" },
      { key: "PRODUCT_NAME", description: "Insurance product name" },
      { key: "TOTAL", description: "Total amount" },
      { key: "STUDENT_NAME", description: "Insured student's name" },
      { key: "SCHOOL_NAME", description: "School name" },
    ],
  },

  "offer": {
    subject: "Angebot {{OFFER_NUMBER}} — InterACT English",
    html_body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="text-align: right; margin-bottom: 24px;">
    <strong>InterACT English gGmbH</strong><br/>
    Planufer 92B, 10967 Berlin<br/>
    Tel. 030 20339702<br/>
    www.interactenglish.de<br/>
    info@interactenglish.de
  </div>
  <p>Liebe*r {{CONTACT_NAME}},</p>
  <p>vielen Dank für Ihr Interesse an unserer Arbeit.</p>
  <p>Wie gewünscht sende ich Ihnen hiermit ein Angebot für Ihr Englisch Projekt mit InterACT English zu.</p>
  <p>Im Anhang finden Sie ein Angebot, basierend auf den folgenden Daten:</p>
  <ul>
    <li>Zahl der Teilnehmenden: {{NUM_STUDENTS}}</li>
    <li>Gruppen: {{NUM_GROUPS}}*</li>
    <li>Native Speaker: {{NUM_TAS}}*</li>
  </ul>
  <p style="font-size: 13px; color: #666;">*Basierend auf der geschätzten Teilnehmendenanzahl</p>
  <p>Ich freue mich die weiteren Schritte mit Ihnen zu besprechen. Gerne unterstützen wir Sie auch in der Präsentation dieses Angebots vor Ihren Kolleg*innen, Eltern, Schüler*innen oder der Schulleitung. Lassen Sie uns gerne wissen, inwiefern wir Ihnen behilflich sein können.</p>
  <p>Vielen Dank und bis bald,</p>
  <p>
    The InterACT School Partnerships Team<br/>
    InterACT English gGmbH<br/>
    connect@interactenglish.de
  </p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;" />
  <p style="font-size: 11px; color: #999;">
    InterACT English gGmbH | Planufer 92B | 10967 Berlin | Deutschland<br/>
    Tel: 03020339702 | info@interactenglish.de | www.interactenglish.de<br/>
    Handelsregister: Amtsgericht Charlottenburg | HR Nr.: HRB 188932 B<br/>
    Steuernummer: 27/614/02133 | Geschäftsführer: Mark William Hansen &amp; Charles Justin Beard
  </p>
</div>`,
    variables: [
      { key: "CONTACT_NAME", description: "School contact name" },
      { key: "SCHOOL_NAME", description: "School name" },
      { key: "OFFER_NUMBER", description: "Offer number" },
      { key: "NUM_STUDENTS", description: "Number of students" },
      { key: "NUM_GROUPS", description: "Number of groups" },
      { key: "NUM_TAS", description: "Number of teaching artists" },
    ],
  },
};
