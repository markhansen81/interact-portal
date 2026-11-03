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
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  total: number;
  status: string;
  submitted_at: string | null;
  work_order_id: string | null;
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

function fmt(n: number | null | undefined) {
  if (n == null) return null;
  return `€${Number(n).toFixed(2)}`;
}

const FAQ = [
  {
    q: "When do I submit my invoice?",
    a: "After the project is complete and your work order is signed. You should invoice within 30 days of the project end date.",
  },
  {
    q: "What if my invoice total doesn't match?",
    a: "The amounts shown are calculated from your level and the pay scale. If you believe there's a discrepancy, contact your coordinator before submitting.",
  },
  {
    q: "Do I charge VAT (Mehrwertsteuer)?",
    a: 'Most TAs are Kleinunternehmer and do not charge VAT. If so, include: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet." If you are VAT-registered, contact admin.',
  },
  {
    q: "Can I invoice for travel?",
    a: "Only if a travel stipend is shown on your project card. The amount is based on your travel time to the school. If travel hours are missing, contact your coordinator.",
  },
  {
    q: "Can I include equipment rental?",
    a: "Only if the project card shows equipment was provided. Do not include equipment costs for projects where you did not receive equipment.",
  },
  {
    q: "What file format should my invoice be?",
    a: "PDF only, ideally 1 page. Make sure your invoice number is unique — you cannot re-use numbers.",
  },
  {
    q: "How long until I get paid?",
    a: "Once your invoice is approved, payment is processed within 30 days to your registered IBAN.",
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

  const pendingWOs = workOrders.filter((wo) => !invoiceByWO.has(wo.id));
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
        {/* Pending WOs — primary action */}
        {pendingWOs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Ready to Invoice ({pendingWOs.length})
            </h3>
            <div className="divide-y divide-neutral-100 rounded-sm border border-neutral-200 bg-white">
              {pendingWOs.map((wo) => {
                const total = (wo.expected_fee ?? 0) + (wo.travel_stipend ?? 0);
                const hasTotal = wo.expected_fee != null;
                return (
                  <div key={wo.id} className="flex items-center gap-4 p-4">
                    {/* Left: project info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{wo.project_name}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {wo.program_type} · {wo.days} {wo.days === 1 ? "day" : "days"} · {wo.start_date}
                        {wo.school ? ` · ${wo.school}` : ""}
                      </p>
                    </div>

                    {/* Middle: expected total */}
                    <div className="hidden sm:block text-right shrink-0">
                      {hasTotal ? (
                        <>
                          <p className="text-sm font-semibold text-neutral-900">{fmt(total)}</p>
                          <p className="text-[11px] text-neutral-400">expected</p>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-400">Rate not set</p>
                      )}
                    </div>

                    {/* Right: action */}
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
                    <Badge variant={statusVariant[inv.status] || "default"}>{inv.status}</Badge>
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
                    <Badge variant={statusVariant[inv.status] || "default"}>{inv.status}</Badge>
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
