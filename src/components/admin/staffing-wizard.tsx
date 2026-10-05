"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  program_type: string | null;
  school: string | null;
}

interface AvailableTA {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
  pay_level: number | null;
  available_days: number;
  available_dates: string[];
  total_days: number;
  preference: string;
  is_already_assigned: boolean;
}

const preferenceStyles: Record<string, { label: string; className: string }> = {
  pro: { label: "Pro", className: "bg-green-100 text-green-700" },
  yes: { label: "Can do", className: "bg-yellow-100 text-yellow-700" },
  no: { label: "Not for me", className: "bg-red-100 text-red-700" },
  unknown: { label: "Unknown", className: "bg-zinc-100 text-zinc-500" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function StaffingWizard({
  project,
  onClose,
  onComplete,
}: {
  project: Project;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [tas, setTas] = useState<AvailableTA[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [projectDates, setProjectDates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signBy, setSignBy] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ created: string[]; errors?: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAvailableTAs();
  }, [project.id]);

  async function fetchAvailableTAs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/available-tas`);
      if (res.ok) {
        const data = await res.json();
        setTas(data.tas || []);
        setTotalDays(data.totalDays || 0);
        setProjectDates(data.projectDates || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load TAs");
      }
    } catch {
      setError("Failed to load available TAs");
    } finally {
      setLoading(false);
    }
  }

  function toggleTA(taId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taId)) {
        next.delete(taId);
      } else {
        next.add(taId);
      }
      return next;
    });
  }

  async function sendWorkOrders() {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/send-work-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ta_ids: Array.from(selected),
          sign_by: signBy || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        onComplete();
      } else {
        setError(data.error || "Failed to send work orders");
      }
    } catch {
      setError("Failed to send work orders");
    } finally {
      setSending(false);
    }
  }

  const selectedTAs = tas.filter((t) => selected.has(t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Staff Project
            </h2>
            <p className="text-sm text-zinc-500">
              {project.name} {project.school ? `- ${project.school}` : ""}
              {project.start_date && project.end_date && (
                <span className="ml-2">
                  ({formatDate(project.start_date)} - {formatDate(project.end_date)})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-zinc-200 px-6 dark:border-zinc-800">
          <button
            onClick={() => !result && setStep(1)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              step === 1
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            1. Select TAs
          </button>
          <button
            onClick={() => selected.size > 0 && !result && setStep(2)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              step === 2
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            2. Confirm & Send
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          {result ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Work Orders Sent
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {result.created.length} work order{result.created.length !== 1 ? "s" : ""} created and sent.
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-left text-sm text-yellow-700">
                  <p className="font-medium">Some issues:</p>
                  <ul className="mt-1 list-disc pl-4">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={onClose}
                className="mt-6 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Close
              </button>
            </div>
          ) : step === 1 ? (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                </div>
              ) : tas.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No active TAs found. Make sure TAs have submitted availability for the project dates.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-zinc-500">
                      {tas.length} Teaching Artist{tas.length !== 1 ? "s" : ""} found
                      {totalDays > 0 && ` - ${totalDays} project day${totalDays !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {selected.size} selected
                    </p>
                  </div>

                  <div className="space-y-2">
                    {tas.map((ta) => {
                      const isSelected = selected.has(ta.id);
                      const pref = preferenceStyles[ta.preference] || preferenceStyles.unknown;
                      const isFullyAvailable = ta.available_days === ta.total_days;

                      return (
                        <div
                          key={ta.id}
                          onClick={() => !ta.is_already_assigned && toggleTA(ta.id)}
                          className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                            ta.is_already_assigned
                              ? "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-800/50"
                              : isSelected
                                ? "cursor-pointer border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                                : "cursor-pointer border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              ta.is_already_assigned
                                ? "border-zinc-300 bg-zinc-200 dark:border-zinc-600"
                                : isSelected
                                  ? "border-blue-500 bg-blue-500 text-white"
                                  : "border-zinc-300 dark:border-zinc-600"
                            }`}
                          >
                            {(isSelected || ta.is_already_assigned) && (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Photo */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            {ta.photo_url ? (
                              <img
                                src={ta.photo_url}
                                alt={ta.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span>
                                {(ta.first_name?.[0] || "").toUpperCase()}
                                {(ta.last_name?.[0] || "").toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Name & details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {ta.name}
                              </span>
                              {ta.is_already_assigned && (
                                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                                  Already assigned
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">
                              Pay level {ta.pay_level || "N/A"}
                            </p>
                          </div>

                          {/* Availability */}
                          <div className="text-right">
                            <div
                              className={`text-sm font-medium ${
                                isFullyAvailable
                                  ? "text-green-600"
                                  : ta.available_days > 0
                                    ? "text-yellow-600"
                                    : "text-red-500"
                              }`}
                            >
                              {ta.available_days}/{ta.total_days} days
                            </div>
                            <div className="mt-1 flex gap-0.5 justify-end">
                              {projectDates.map((date) => (
                                <div
                                  key={date}
                                  title={formatDate(date)}
                                  className={`h-2 w-2 rounded-full ${
                                    ta.available_dates.includes(date)
                                      ? "bg-green-500"
                                      : "bg-red-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Program preference */}
                          <div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pref.className}`}
                            >
                              {pref.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Step 2: Confirm & Send */
            <div>
              <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Selected Teaching Artists ({selectedTAs.length})
              </h3>

              <div className="mb-6 space-y-2">
                {selectedTAs.map((ta) => {
                  const pref = preferenceStyles[ta.preference] || preferenceStyles.unknown;
                  return (
                    <div
                      key={ta.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {ta.photo_url ? (
                            <img
                              src={ta.photo_url}
                              alt={ta.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span>
                              {(ta.first_name?.[0] || "").toUpperCase()}
                              {(ta.last_name?.[0] || "").toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {ta.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {ta.available_days}/{ta.total_days} days available
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pref.className}`}>
                          {pref.label}
                        </span>
                        <button
                          onClick={() => toggleTA(ta.id)}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sign by date */}
              <div className="mb-6">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Sign by date (optional)
                </label>
                <input
                  type="date"
                  value={signBy}
                  onChange={(e) => setSignBy(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Summary</h4>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>Project: {project.name}</li>
                  <li>School: {project.school || "N/A"}</li>
                  <li>Program: {project.program_type || "N/A"}</li>
                  <li>
                    Work orders to create: {selectedTAs.length}
                  </li>
                  <li>Each TA will receive an email notification</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <button
              onClick={step === 1 ? onClose : () => setStep(1)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={selected.size === 0}
                className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Next: Review ({selected.size} selected)
              </button>
            ) : (
              <button
                onClick={sendWorkOrders}
                disabled={sending || selectedTAs.length === 0}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? "Sending..." : `Create & Send ${selectedTAs.length} Work Order${selectedTAs.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
