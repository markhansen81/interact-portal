import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { EmailPreviewCard } from "@/components/admin/email-preview-card";
import { templateDefaults } from "@/lib/email-templates";
import {
  workOrderSentEmail,
  invoiceSubmittedEmail,
  documentExpiringEmail,
  nudgeEmail,
  newMessageEmail,
  newLeadEmail,
  workOrderSignedEmailToTA,
  workOrderSignedEmailToAdmin,
  workOrderDeclinedEmailToAdmin,
  schoolInvoiceEmail,
  workOrderCancelledEmail,
  insuranceOrderConfirmationEmail,
  offerEmail,
} from "@/lib/email";

export default async function EmailTemplatesPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  // Fetch all customized templates from DB
  const supabase = await createClient();
  const { data: dbTemplates } = await supabase
    .from("email_templates")
    .select("id, subject, html_body, updated_at");

  const dbMap = new Map((dbTemplates ?? []).map((t) => [t.id, t]));

  // Catalog: sample-rendered versions for preview
  const catalog = [
    {
      id: "work-order-sent",
      name: "New Work Order",
      trigger: "Admin sends a work order to a TA",
      recipients: "TA" as const,
      language: "en" as const,
      ...workOrderSentEmail("Anna Schmidt", "Big Bang Academy Berlin", "15 Nov 2026", "abc123"),
    },
    {
      id: "invoice-submitted",
      name: "Invoice Submitted",
      trigger: "TA submits an invoice",
      recipients: "Admin" as const,
      language: "en" as const,
      ...invoiceSubmittedEmail("Anna Schmidt", "RE-2026-042", 1250.00),
    },
    {
      id: "document-expiring",
      name: "Document Expiring",
      trigger: "Document expiry reminder (30/60/90 days)",
      recipients: "TA" as const,
      language: "en" as const,
      ...documentExpiringEmail("Anna Schmidt", "Police Check", "31 Dec 2026"),
    },
    {
      id: "nudge",
      name: "Admin Nudge",
      trigger: "Admin manually nudges a TA about a pending item",
      recipients: "TA" as const,
      language: "en" as const,
      ...nudgeEmail("Anna Schmidt", "Police Check Upload", "Please upload your police check to complete onboarding.", "/portal/documents"),
    },
    {
      id: "new-message",
      name: "New Message",
      trigger: "Admin or TA sends a message",
      recipients: "TA / Admin" as const,
      language: "en" as const,
      ...newMessageEmail("Anna Schmidt", "Justin Beard"),
    },
    {
      id: "new-lead",
      name: "New Lead",
      trigger: "Lead form submitted on website",
      recipients: "Admin" as const,
      language: "en" as const,
      ...newLeadEmail({
        name: "Dr. Müller",
        email: "mueller@gym-nord.de",
        school: "Gymnasium Nord Berlin",
        programs: ["Big Bang", "Camp"],
        grades: ["5", "6"],
        num_students: "60",
        num_groups: "3",
      }),
    },
    {
      id: "wo-signed-ta",
      name: "Work Order Signed (TA copy)",
      trigger: "TA signs a work order",
      recipients: "TA" as const,
      language: "en" as const,
      ...workOrderSignedEmailToTA("Anna Schmidt", "Big Bang Academy Berlin", "Gymnasium Nord"),
    },
    {
      id: "wo-signed-admin",
      name: "Work Order Signed (admin copy)",
      trigger: "TA signs a work order",
      recipients: "Admin" as const,
      language: "en" as const,
      ...workOrderSignedEmailToAdmin("Anna Schmidt", "Big Bang Academy Berlin", "Gymnasium Nord"),
    },
    {
      id: "wo-declined",
      name: "Work Order Declined",
      trigger: "TA declines a work order",
      recipients: "Admin" as const,
      language: "en" as const,
      ...workOrderDeclinedEmailToAdmin("Anna Schmidt", "Big Bang Academy Berlin", "Gymnasium Nord", "Date conflict with another project"),
    },
    {
      id: "school-invoice",
      name: "School Invoice",
      trigger: "Admin sends a school invoice",
      recipients: "School" as const,
      language: "de" as const,
      ...schoolInvoiceEmail("RE-2026-087", "Gymnasium Nord Berlin", "€4.500,00", "30 Nov 2026"),
    },
    {
      id: "wo-cancelled",
      name: "Work Order Cancelled",
      trigger: "Admin cancels a work order",
      recipients: "TA" as const,
      language: "en" as const,
      ...workOrderCancelledEmail("Anna Schmidt", "Big Bang Academy Berlin", "Project dates changed"),
    },
    {
      id: "insurance-confirmation",
      name: "Insurance Order Confirmation",
      trigger: "Parent purchases project insurance via Squarespace",
      recipients: "Parent" as const,
      language: "de" as const,
      ...insuranceOrderConfirmationEmail(
        "Maria Müller",
        "INS-2026-012",
        "Projektversicherung Standard",
        "€12,00",
        "Max Müller",
        "Gymnasium Nord"
      ),
    },
    {
      id: "offer",
      name: "Offer Email",
      trigger: "Admin sends an offer PDF to a school",
      recipients: "School" as const,
      language: "de" as const,
      ...offerEmail({
        contactName: "Dr. Müller",
        schoolName: "Gymnasium Nord Berlin",
        offerNumber: "ANG-2026-034",
        numStudents: 60,
        numGroups: 3,
        numTas: 3,
      }),
    },
  ];

  const customizedCount = dbMap.size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description={`${catalog.length} transactional email templates sent via Resend.${customizedCount > 0 ? ` ${customizedCount} customized.` : ""}`}
      />

      <div className="space-y-4">
        {catalog.map((template) => (
          <EmailPreviewCard
            key={template.id}
            {...template}
            dbTemplate={dbMap.get(template.id) ?? null}
            templateDefault={templateDefaults[template.id]}
          />
        ))}
      </div>
    </div>
  );
}
