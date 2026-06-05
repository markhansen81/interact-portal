"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface WorkOrder {
  id: string;
  project_name: string;
  days: number;
  total: number;
  program_type: string;
  start_date: string;
  end_date: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  address: string | null;
  pay_level: number;
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
  };
}

export function InvoiceUploader({
  workOrders,
  profile,
}: {
  workOrders: WorkOrder[];
  profile: Profile;
}) {
  const router = useRouter();
  const [selectedWO, setSelectedWO] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<AICheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  async function handleUpload() {
    if (!file || !selectedWO) return;

    setUploading(true);

    // Upload to Supabase storage
    const supabase = createClient();
    const fileName = `invoices/${profile.id}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (error) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(data.path);

    setUploadedUrl(urlData.publicUrl);
    setUploading(false);

    // Run AI check
    setChecking(true);
    const wo = workOrders.find((w) => w.id === selectedWO);

    try {
      const res = await fetch("/api/portal/invoices/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: urlData.publicUrl,
          work_order: wo,
          profile: {
            name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            address: profile.address,
            pay_level: profile.pay_level,
          },
        }),
      });

      const result = await res.json();
      setCheckResult(result);
    } catch {
      alert("Failed to check invoice. Please try again.");
    }
    setChecking(false);
  }

  async function handleSubmit() {
    if (!uploadedUrl || !selectedWO) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/portal/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_order_id: selectedWO,
          base_amount: workOrders.find((w) => w.id === selectedWO)?.total || 0,
          addons_total: 0,
          total: workOrders.find((w) => w.id === selectedWO)?.total || 0,
          source: "upload",
          uploaded_pdf_url: uploadedUrl,
          ai_check_result: checkResult,
          ai_check_passed: checkResult?.passed,
        }),
      });

      if (res.ok) {
        router.push("/portal/invoices");
        router.refresh();
      }
    } catch {
      alert("Failed to submit invoice. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/portal/invoices" className="text-sm text-zinc-500 hover:text-zinc-700">
        &larr; Back
      </Link>

      {/* Select Work Order */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Which work order is this invoice for?
        </label>
        <select
          value={selectedWO}
          onChange={(e) => setSelectedWO(e.target.value)}
          className="input"
        >
          <option value="">Select work order...</option>
          {workOrders.map((wo) => (
            <option key={wo.id} value={wo.id}>
              {wo.project_name} — {wo.program_type} — {wo.start_date}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Area */}
      {selectedWO && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Upload your invoice (PDF)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />

          {file && !uploadedUrl && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {uploading ? "Uploading..." : "Upload & Check"}
            </button>
          )}
        </div>
      )}

      {/* AI Check Progress */}
      {checking && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Checking your invoice...
          </p>
          <p className="mt-1 text-xs text-blue-500">
            Verifying: name, address, tax number, bank details, correct rate, totals
          </p>
        </div>
      )}

      {/* AI Check Results */}
      {checkResult && (
        <div
          className={`rounded-xl border p-6 ${
            checkResult.passed
              ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
              : "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10"
          }`}
        >
          <h3
            className={`font-semibold ${
              checkResult.passed
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {checkResult.passed ? "Invoice looks good!" : "Issues found"}
          </h3>

          {checkResult.issues.length > 0 && (
            <div className="mt-3 space-y-1">
              {checkResult.issues.map((issue, i) => (
                <p key={i} className="text-sm text-red-600 dark:text-red-400">
                  &bull; {issue}
                </p>
              ))}
            </div>
          )}

          {checkResult.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {checkResult.warnings.map((warning, i) => (
                <p key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
                  &bull; {warning}
                </p>
              ))}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {submitting
                ? "Submitting..."
                : checkResult.passed
                  ? "Submit Invoice"
                  : "Submit Anyway"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
