"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

interface AICheckResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  extracted: {
    invoice_number?: string;
    total?: number;
    ta_name?: string;
    date?: string;
    has_address?: boolean;
    has_tax_number?: boolean;
    has_bank_details?: boolean;
    line_items?: { description: string; total: number | null; type: string }[];
    client_name?: string;
    project_dates?: string;
    has_kleinunternehmer?: boolean;
    has_payment_terms?: boolean;
    page_count?: number;
  } | null;
  ai_extraction_failed?: boolean;
  _uploadedUrl?: string;
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `€${Number(n).toFixed(2)}`;
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? "bg-green-100 text-green-600" : "bg-neutral-100 text-neutral-400"}`}>
        {ok ? "✓" : "·"}
      </span>
      <span className={`text-[13px] ${ok ? "text-neutral-700" : "text-neutral-500"}`}>{label}</span>
    </div>
  );
}

export function InvoiceUploadModal({
  workOrder,
  profile,
  onClose,
}: {
  workOrder: WorkOrder;
  profile: Profile;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"requirements" | "upload">("requirements");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AICheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wo = workOrder;
  const isCamp = wo.program_type?.toLowerCase().includes("camp") || wo.program_type?.toLowerCase().includes("sommer");
  const totalExpected = (wo.expected_fee ?? 0) + (wo.travel_stipend ?? 0);

  const profileName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const profileAddress = [profile.street, profile.postal_code, profile.city].filter(Boolean).join(", ");

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    const supabase = createClient();
    const fileName = `invoices/${profile.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("documents").upload(fileName, file);

    if (error) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: signedData } = await supabase.storage.from("documents").createSignedUrl(data.path, 86400);
    const signedUrl = signedData?.signedUrl || "";

    setUploading(false);
    setChecking(true);

    try {
      const res = await fetch("/api/portal/invoices/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: signedUrl, work_order: { id: wo.id } }),
      });
      const result = await res.json();
      result._uploadedUrl = signedUrl;
      setCheckResult(result);
    } catch {
      alert("Failed to check invoice. Please try again.");
    }
    setChecking(false);
  }

  async function handleSubmit() {
    if (!checkResult?._uploadedUrl) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_order_id: wo.id,
          base_amount: wo.expected_fee || 0,
          addons_total: wo.travel_stipend || 0,
          total: totalExpected,
          source: "upload",
          uploaded_pdf_url: checkResult._uploadedUrl,
          ai_check_result: checkResult,
          ai_check_passed: checkResult.passed,
        }),
      });
      if (res.ok) {
        onClose();
        router.refresh();
      }
    } catch {
      alert("Failed to submit invoice. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Invoice Upload</p>
            <h2 className="text-base font-semibold text-neutral-900">{wo.project_name}</h2>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "requirements" ? (
          <div className="space-y-5 px-6 py-5">
            {/* Project Summary */}
            <div className="rounded-sm bg-neutral-50 p-4 text-[13px] space-y-1.5">
              <p className="font-semibold text-neutral-800 mb-2">Project Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-600">
                <span className="text-neutral-400">School</span><span>{wo.school || "—"}</span>
                <span className="text-neutral-400">Program</span><span>{wo.program_type}</span>
                <span className="text-neutral-400">Dates</span><span>{wo.start_date} – {wo.end_date}</span>
                <span className="text-neutral-400">Days</span><span>{wo.days}</span>
                <span className="text-neutral-400">Level</span><span>{isCamp ? `Camp Level ${profile.camp_level}` : `Level ${profile.pay_level}`}</span>
              </div>
            </div>

            {/* Expected Invoice Breakdown */}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-neutral-800">Expected Invoice Amounts</p>
              <div className="divide-y divide-neutral-100 rounded-sm border border-neutral-200 text-[13px]">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-neutral-600">Instruction fee ({wo.days} {wo.days === 1 ? "day" : "days"})</span>
                  <span className="font-medium text-neutral-900">{fmt(wo.expected_fee)}</span>
                </div>
                {wo.travel_hours != null && wo.travel_hours > 0 && wo.travel_stipend != null && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-neutral-600">Travel stipend ({wo.travel_hours}h travel)</span>
                    <span className="font-medium text-neutral-900">{fmt(wo.travel_stipend)}</span>
                  </div>
                )}
                {wo.equipment_provided && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-neutral-600">Equipment rental</span>
                    <span className="text-xs text-neutral-400 self-center">check contract</span>
                  </div>
                )}
                <div className="flex justify-between bg-neutral-50 px-4 py-2.5 font-semibold">
                  <span className="text-neutral-800">Total (excl. VAT)</span>
                  <span className="text-neutral-900">{fmt(totalExpected)}</span>
                </div>
              </div>
              {wo.travel_hours == null && (
                <p className="mt-1.5 text-[11px] text-neutral-400">Travel hours not set — no travel stipend included. Contact your coordinator if you believe you are entitled to one.</p>
              )}
            </div>

            {/* What to include */}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-neutral-800">Your invoice must include</p>
              <div className="space-y-2 rounded-sm border border-neutral-200 p-4">
                <CheckItem ok={!!profileName} label={`Your full name: ${profileName || "Missing — add in Profile"}`} />
                <CheckItem ok={!!profileAddress} label={`Your address: ${profileAddress || "Missing — add in Profile → Payroll"}`} />
                <CheckItem ok={!!profile.tax_number} label={`Your Steuernummer: ${profile.tax_number || "Missing — add in Profile → Payroll"}`} />
                <CheckItem ok={!!profile.iban} label={`Your IBAN: ${profile.iban || "Missing — add in Profile → Payroll"}`} />
                {profile.bic && <CheckItem ok={true} label={`Your BIC: ${profile.bic}`} />}
                <CheckItem ok={true} label={'Client: InterACT English gGmbH, Planufer 92B, 10967 Berlin'} />
                <CheckItem ok={true} label={`Project period: ${wo.start_date} – ${wo.end_date}`} />
                <CheckItem ok={true} label={`Instruction fee: ${fmt(wo.expected_fee)}`} />
                {!profile.vat_registered && (
                  <CheckItem ok={true} label={'§19 UStG clause: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet."'} />
                )}
                <CheckItem ok={true} label={'Payment terms: e.g. "Zahlbar innerhalb von 30 Tagen."'} />
                <CheckItem ok={true} label={'A unique invoice number (Rechnungsnummer)'} />
                <CheckItem ok={true} label={'Invoice date (Rechnungsdatum)'} />
              </div>
            </div>

            {/* What NOT to include */}
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 text-[13px] space-y-1.5">
              <p className="font-semibold text-amber-800 mb-1">Do not include</p>
              <p className="text-amber-700">• VAT / Mehrwertsteuer (unless you are VAT-registered)</p>
              <p className="text-amber-700">• Material costs — only services are invoiceable</p>
              {!wo.equipment_provided && <p className="text-amber-700">• Equipment rental — not applicable for this project</p>}
              {(wo.travel_hours == null || wo.travel_hours === 0) && <p className="text-amber-700">• Travel stipend — not entitled for this project</p>}
            </div>

            <button
              onClick={() => setStep("upload")}
              className="w-full rounded-sm bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              I have my invoice ready — Upload
            </button>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <button
              onClick={() => { setStep("requirements"); setFile(null); setCheckResult(null); }}
              className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to requirements
            </button>

            {!checkResult && !checking && (
              <div className="rounded-sm border border-neutral-200 bg-white p-5">
                <p className="mb-3 text-[13px] font-medium text-neutral-700">Upload your invoice PDF</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-sm file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
                />
                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="mt-4 w-full rounded-sm bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Upload & Check with AI"}
                  </button>
                )}
              </div>
            )}

            {checking && (
              <div className="rounded-sm border border-blue-100 bg-blue-50 p-5 text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                <p className="text-sm font-medium text-blue-700">Checking your invoice…</p>
                <p className="mt-1 text-xs text-blue-500">Verifying name, address, tax number, rates, legal clauses…</p>
              </div>
            )}

            {checkResult && (
              <div className={`rounded-sm border p-5 ${checkResult.passed ? "border-green-200 bg-green-50" : "border-red-100 bg-red-50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${checkResult.passed ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"}`}>
                    {checkResult.passed ? "✓" : "!"}
                  </span>
                  <p className={`font-semibold text-sm ${checkResult.passed ? "text-green-700" : "text-red-700"}`}>
                    {checkResult.passed ? "Invoice looks good!" : "Issues found"}
                  </p>
                </div>

                {checkResult.issues.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {checkResult.issues.map((issue, i) => (
                      <p key={i} className="text-[13px] text-red-600">• {issue}</p>
                    ))}
                  </div>
                )}

                {checkResult.warnings.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {checkResult.warnings.map((w, i) => (
                      <p key={i} className="text-[13px] text-amber-600">• {w}</p>
                    ))}
                  </div>
                )}

                {!checkResult.passed && (
                  <p className="mb-3 text-xs text-neutral-500">Fix the issues above, then re-upload. Or submit anyway and an admin will review manually.</p>
                )}

                <div className="flex gap-3">
                  {!checkResult.passed && (
                    <button
                      onClick={() => { setFile(null); setCheckResult(null); }}
                      className="flex-1 rounded-sm border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Re-upload
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-sm bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : checkResult.passed ? "Submit Invoice" : "Submit Anyway"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
