"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { InvoiceUploadModal } from "./invoice-upload-modal";

interface WorkOrder {
  id: string;
  project_name: string;
  school: string | null;
  days: number;
  program_type: string;
  start_date: string;
  end_date: string;
  travel_hours: number | null;
  equipment_provided: boolean | null;
  expected_fee: number | null;
  travel_stipend: number | null;
  upload_locked: boolean;
  available_from: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  total: number;
  status: string;
  submitted_at: string | null;
  work_order_id: string | null;
  pdf_url: string | null;
  uploaded_pdf_url: string | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  tax_number: string | null;
  iban: string | null;
  bic: string | null;
  vat_registered: boolean | null;
  pay_level: number;
  camp_level: number;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  draft: "default",
  submitted: "warning",
  approved: "info",
  paid: "success",
  rejected: "error",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  submitted: "Being Reviewed",
  approved: "Accepted",
  paid: "Paid",
  rejected: "Rejected",
};

function fmt(n: number | null | undefined) {
  if (n == null) return null;
  return `€${Number(n).toFixed(2)}`;
}

const FAQ = [
  {
    q: "What should I write as the service description?",
    a: 'Use a clear description of the service, e.g. "Instruction of Native Speaker Week" or "Instruction of Theatre Week". Do not write "teaching" or "Unterricht" — the service is instruction of an English immersion program.',
  },
  {
    q: "What must my invoice include?",
    a: "Your full name and address · Your Steuernummer · A unique invoice number (Rechnungsnummer) · The invoice date (Rechnungsdatum) · The project dates · Your teaching/camp level · A description of the service · The fee amount · Your bank details (IBAN + BIC) · The §19 UStG clause (if Kleinunternehmer) · Payment terms.",
  },
  {
    q: "What is the §19 UStG clause and do I need it?",
    a: 'If you are a Kleinunternehmer (most TAs are), you must include the phrase: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet." This means you are exempt from charging VAT. If you are VAT-registered, contact your coordinator before invoicing.',
  },
  {
    q: "What payment terms should I include?",
    a: 'Add a payment terms line such as: "Zahlbar innerhalb von 30 Tagen nach Erhalt der Rechnung." This is standard and required on German invoices.',
  },
  {
    q: "Can I only invoice for my instruction fee?",
    a: "Only services are invoiceable. Do not include cost reimbursements (Auslagenerstattung) such as travel costs, materials, or receipts on your invoice. These are handled separately through the Auslagenerstattung form. Your invoice should only reflect the instruction fee and, if applicable, a travel stipend shown on your project card.",
  },
  {
    q: "What format should my invoice be in?",
    a: "PDF only, ideally 1 page. Use your own invoice design — do not use the InterACT invoice template. Every invoice must have a unique invoice number; you cannot reuse numbers.",
  },
  {
    q: "What if my invoice total doesn't match what's shown here?",
    a: "The amounts here are calculated from your pay level and the current pay scale. If you believe there is a discrepancy, contact your coordinator before uploading. Do not submit an invoice with a different total without checking first.",
  },
  {
    q: "When can I submit my invoice?",
    a: "You can upload your invoice the day after the project ends. The upload button will unlock automatically. Please invoice within 30 days of the project end date.",
  },
  {
    q: "How long until I get paid?",
    a: "Once your invoice is accepted, payment is processed within 30 days to your registered IBAN. Make sure your IBAN is up to date in your profile under Payroll.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3 text-left text-[13px] font-medium text-neutral-800 hover:text-neutral-900"
      >
        {q}
        <svg className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="pb-3 text-[13px] text-neutral-500">{a}</p>}
    </div>
  );
}

export function InvoicesPageClient({
  workOrders,
  invoices,
  profile,
}: {
  workOrders: WorkOrder[];
  invoices: Invoice[];
  profile: Profile;
}) {
  const [activeModal, setActiveModal] = useState<WorkOrder | null>(null);

  // Group invoices by WO id for quick lookup
  const invoiceByWO = new Map<string, Invoice>();
  for (const inv of invoices) {
    if (inv.work_order_id) invoiceByWO.set(inv.work_order_id, inv);
  }

  const uninvoicedWOs = workOrders.filter((wo) => !invoiceByWO.has(wo.id));
  const readyWOs = uninvoicedWOs.filter((wo) => !wo.upload_locked);
  const upcomingWOs = uninvoicedWOs.filter((wo) => wo.upload_locked);
  const invoicedWOs = workOrders.filter((wo) => invoiceByWO.has(wo.id));

  return (
    <>
      {activeModal && (
        <InvoiceUploadModal
          workOrder={activeModal}
          profile={profile}
          onClose={() => setActiveModal(null)}
        />
      )}

      <div className="space-y-8">
        {/* Ready to invoice */}
        {readyWOs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Ready to Invoice ({readyWOs.length})
            </h3>
            <div className="divide-y divide-neutral-100 rounded-sm border border-neutral-200 bg-white">
              {readyWOs.map((wo) => {
                const total = (wo.expected_fee ?? 0) + (wo.travel_stipend ?? 0);
                return (
                  <div key={wo.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{wo.project_name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {wo.program_type} · {wo.days} {wo.days === 1 ? "day" : "days"} · {wo.start_date}
                        {wo.school ? ` · ${wo.school}` : ""}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      {wo.expected_fee != null ? (
                        <>
                          <p className="text-sm font-semibold text-neutral-900">{fmt(total)}</p>
                          <p className="text-[11px] text-neutral-400">expected</p>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-400">Rate not set</p>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveModal(wo)}
                      className="shrink-0 rounded-sm bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800"
                    >
                      Upload Invoice
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming projects — not yet billable */}
        {upcomingWOs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Upcoming Projects ({upcomingWOs.length})
            </h3>
            <div className="divide-y divide-neutral-100 rounded-sm border border-neutral-200 bg-white">
              {upcomingWOs.map((wo) => {
                const total = (wo.expected_fee ?? 0) + (wo.travel_stipend ?? 0);
                return (
                  <div key={wo.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{wo.project_name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {wo.program_type} · {wo.days} {wo.days === 1 ? "day" : "days"} · {wo.start_date} – {wo.end_date}
                        {wo.school ? ` · ${wo.school}` : ""}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      {wo.expected_fee != null ? (
                        <>
                          <p className="text-sm font-semibold text-neutral-900">{fmt(total)}</p>
                          <p className="text-[11px] text-neutral-400">expected</p>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-400">Rate not set</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="rounded-sm border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-300 cursor-not-allowed select-none">
                        Upload Invoice
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-400">Available {wo.available_from}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {workOrders.length === 0 && (
          <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="text-sm text-neutral-500">No signed work orders yet.</p>
            <p className="mt-1 text-xs text-neutral-400">Your signed work orders will appear here once confirmed.</p>
          </div>
        )}

        {/* Invoice History */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Invoice History
          </h3>
          {invoices.length === 0 ? (
            <div className="rounded-sm border border-dashed border-neutral-200 bg-white p-8 text-center">
              <p className="text-sm text-neutral-400">No invoices submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 rounded-sm border border-neutral-200 bg-white">
              {/* Invoiced WOs first */}
              {invoicedWOs.map((wo) => {
                const inv = invoiceByWO.get(wo.id)!;
                return (
                  <div key={inv.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-neutral-900">
                        {inv.invoice_number ? `#${inv.invoice_number}` : `Invoice (${wo.project_name})`}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {wo.project_name} · {inv.submitted_at ? new Date(inv.submitted_at).toLocaleDateString("en-GB") : "Draft"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-neutral-800">{fmt(inv.total)}</span>
                    {(inv.pdf_url || inv.uploaded_pdf_url) && (
                      <a
                        href={`/api/portal/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-500 underline hover:text-neutral-700"
                      >
                        View PDF
                      </a>
                    )}
                    <Badge variant={statusVariant[inv.status] || "default"}>{statusLabel[inv.status] || inv.status}</Badge>
                  </div>
                );
              })}
              {/* Invoices without matched WO */}
              {invoices
                .filter((inv) => !inv.work_order_id || !workOrders.find((wo) => wo.id === inv.work_order_id))
                .map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-neutral-900">
                        Invoice #{inv.invoice_number || inv.id.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {inv.submitted_at ? new Date(inv.submitted_at).toLocaleDateString("en-GB") : "Draft"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-neutral-800">{fmt(inv.total)}</span>
                    {(inv.pdf_url || inv.uploaded_pdf_url) && (
                      <a
                        href={`/api/portal/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-500 underline hover:text-neutral-700"
                      >
                        View PDF
                      </a>
                    )}
                    <Badge variant={statusVariant[inv.status] || "default"}>{statusLabel[inv.status] || inv.status}</Badge>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">FAQ</h3>
          <div className="rounded-sm border border-neutral-200 bg-white px-4">
            {FAQ.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
