"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { DeleteTAButton } from "@/components/admin/delete-ta-button";
import { Badge } from "@/components/ui";

// ── Date helpers ───────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}
function fmtDateRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  if (!end || end === start) return `${fmtDate(start)} ${start.split("-")[0]}`;
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  if (sy === ey && sm === em) return `${parseInt(start.split("-")[2])}–${fmtDate(end)} ${sy}`;
  if (sy === ey) return `${fmtDate(start)} – ${fmtDate(end)} ${ey}`;
  return `${fmtDate(start)} ${sy} – ${fmtDate(end)} ${ey}`;
}
function expiryStatus(expiry: string | null): "ok" | "soon" | "expired" | "none" {
  if (!expiry) return "none";
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return "expired";
  if (days < 90) return "soon";
  return "ok";
}

// ── Onboarding helpers ─────────────────────────────────────────────────────
const REQUIRED_DOCS = ["visa", "passport", "police_check", "measles"];
const REQUIRED_DOCS_DETAIL = ["visa", "passport", "police_check", "measles", "first_aid"];
const DOC_LABELS: Record<string, string> = {
  visa: "Visa",
  passport: "Passport",
  right_to_work: "Visa/Passport (legacy)",
  police_check: "Police Check",
  measles: "Measles",
  first_aid: "First Aid",
};

interface MissingItem {
  id: string;
  label: string;
  category: "document" | "profile" | "training" | "availability";
  portalPath: string;
}

interface TAProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  photo_url: string | null;
  pay_level: number | null;
  onboarding_status: string | null;
  onboarding_sections_complete: Record<string, boolean> | null;
  training_online: boolean;
  training_offline: boolean;
  qualifying_projects: number;
  total_projects: number;
  is_active: boolean;
  address: string | null;
  iban?: string | null;
  tax_number?: string | null;
  bio?: string | null;
  superpower?: string | null;
}

interface TADoc {
  type: string;
  status: string;
  expiry_date: string | null;
}

interface WorkOrderEntry {
  project_name: string | null;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  program_type: string | null;
}

function getMissing(ta: TAProfile, docs: TADoc[]) {
  const uploadedTypes = new Set(docs.filter((d) => d.status !== "not_uploaded").map((d) => d.type));
  // treat legacy right_to_work as satisfying both visa + passport
  const hasRightToWork = uploadedTypes.has("right_to_work");
  const missing: string[] = [];
  if (!uploadedTypes.has("visa") && !hasRightToWork) missing.push("Visa");
  if (!uploadedTypes.has("passport") && !hasRightToWork) missing.push("Passport");
  if (!uploadedTypes.has("police_check")) missing.push("Police Check");
  if (!uploadedTypes.has("measles")) missing.push("Measles");
  return missing;
}

interface ChecklistItem extends MissingItem {
  done: boolean;
  detail?: string;
}

function getChecklist(ta: TAProfile, docs: TADoc[], prefsCount: number, availCount: number): ChecklistItem[] {
  const uploadedTypes = new Set(docs.filter((d) => d.status !== "not_uploaded").map((d) => d.type));
  const hasRightToWork = uploadedTypes.has("right_to_work");

  const personalFields = ["first_name", "last_name", "phone", "date_of_birth", "nationality", "street", "city", "postal_code"] as const;
  const personalDone = personalFields.filter((f) => !!(ta as any)[f]).length;

  return [
    { id: "personal", label: "Personal Details", detail: `${personalDone}/${personalFields.length}`, done: personalDone === personalFields.length, category: "profile", portalPath: "/portal/profile" },
    { id: "payroll",  label: "Payroll & Banking",  done: !!(ta.iban && ta.tax_number), category: "profile",      portalPath: "/portal/profile" },
    { id: "school",   label: "School Profile",     done: !!(ta.bio && ta.superpower),  category: "profile",      portalPath: "/portal/profile" },
    { id: "photo",    label: "Profile Photo",      done: !!ta.photo_url,               category: "profile",      portalPath: "/portal/profile" },
    { id: "programs", label: "Programs",           detail: `${prefsCount}/29`, done: prefsCount >= 29, category: "profile", portalPath: "/portal/profile" },
    { id: "doc_visa",         label: "Visa",         done: uploadedTypes.has("visa") || hasRightToWork,         category: "document", portalPath: "/portal/documents" },
    { id: "doc_passport",     label: "Passport",     done: uploadedTypes.has("passport") || hasRightToWork,     category: "document", portalPath: "/portal/documents" },
    { id: "doc_police_check", label: "Police Check", done: uploadedTypes.has("police_check"),                   category: "document", portalPath: "/portal/documents" },
    { id: "doc_measles",      label: "Measles",      done: uploadedTypes.has("measles"),                        category: "document", portalPath: "/portal/documents" },
    { id: "doc_first_aid",    label: "First Aid",    done: uploadedTypes.has("first_aid"),                      category: "document", portalPath: "/portal/documents" },
    { id: "training_online",  label: "Online Onboarding",  done: !!ta.training_online,  category: "training",     portalPath: "/portal/profile" },
    { id: "training_offline", label: "Offline Foundation", done: !!ta.training_offline, category: "training",     portalPath: "/portal/profile" },
    { id: "availability",     label: "Set Availability",   done: availCount > 0,        category: "availability", portalPath: "/portal/availability" },
  ];
}

function useDebounce(callback: (value: string) => void, delay: number) {
  const timerRef = useState<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (value: string) => {
      if (timerRef[0]) clearTimeout(timerRef[0]);
      const id = setTimeout(() => callback(value), delay);
      timerRef[1](id);
    },
    [callback, delay, timerRef]
  );
}

const WO_STATUS: Record<string, string> = {
  signed: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-600",
  draft: "bg-neutral-100 text-neutral-400",
  declined: "bg-red-100 text-red-600",
};

export function TASearchFilter({
  tas,
  docsByTA,
  prefsByTA = {},
  availByTA = {},
  workOrdersByTA = {},
}: {
  tas: TAProfile[];
  docsByTA: Record<string, TADoc[]>;
  prefsByTA?: Record<string, number>;
  availByTA?: Record<string, number>;
  workOrdersByTA?: Record<string, WorkOrderEntry[]>;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("all");
  const [payLevelFilter, setPayLevelFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingNudge, setSendingNudge] = useState<string | null>(null);
  const [sentNudges, setSentNudges] = useState<Set<string>>(new Set());

  const debouncedSetSearch = useDebounce(setDebouncedSearch, 300);
  const handleSearchChange = (value: string) => { setSearch(value); debouncedSetSearch(value); };

  async function sendNudge(taId: string, item: MissingItem, taName: string) {
    const key = `${taId}:${item.id}`;
    setSendingNudge(key);
    const messages: Record<string, string> = {
      document: `Hi ${taName}, please upload your ${item.label} as soon as possible so we can get you cleared for projects.`,
      profile: `Hi ${taName}, your ${item.label} is incomplete. Please finish it in the portal.`,
      training: `Hi ${taName}, please complete your ${item.label} to be eligible for work orders.`,
      availability: `Hi ${taName}, please update your availability so we can assign you to projects.`,
    };
    await fetch("/api/admin/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ta_id: taId, item: item.label, message: messages[item.category], portalPath: item.portalPath }),
    });
    setSendingNudge(null);
    setSentNudges((prev) => new Set(prev).add(key));
  }

  async function nudgeAll(taId: string, items: MissingItem[], taName: string) {
    for (const item of items) await sendNudge(taId, item, taName);
  }

  const filtered = useMemo(() => {
    let result = tas;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((ta) =>
        (ta.first_name && ta.first_name.toLowerCase().includes(q)) ||
        (ta.last_name && ta.last_name.toLowerCase().includes(q)) ||
        ta.email.toLowerCase().includes(q) ||
        (ta.phone && ta.phone.toLowerCase().includes(q)) ||
        (`${ta.first_name || ""} ${ta.last_name || ""}`.toLowerCase().includes(q))
      );
    }
    if (onboardingFilter === "pending") result = result.filter((ta) => ["pending", "in_progress"].includes(ta.onboarding_status || ""));
    else if (onboardingFilter === "ready") result = result.filter((ta) => ta.onboarding_status === "ready");
    if (payLevelFilter !== "all") result = result.filter((ta) => ta.pay_level === parseInt(payLevelFilter, 10));
    if (activeFilter === "active") result = result.filter((ta) => ta.is_active);
    else if (activeFilter === "inactive") result = result.filter((ta) => !ta.is_active);
    return result;
  }, [tas, debouncedSearch, onboardingFilter, payLevelFilter, activeFilter]);

  const selectCls = "border border-neutral-300 bg-white rounded-sm px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:border-black focus:ring-0 transition-colors";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by name, email..." className="w-full border border-neutral-300 bg-white rounded-sm py-2 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-0 transition-colors" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={onboardingFilter} onChange={(e) => setOnboardingFilter(e.target.value)} className={selectCls}>
            <option value="all">All Onboarding</option>
            <option value="pending">Pending</option>
            <option value="ready">Ready</option>
          </select>
          <select value={payLevelFilter} onChange={(e) => setPayLevelFilter(e.target.value)} className={selectCls}>
            <option value="all">All Levels</option>
            {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={selectCls}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-neutral-500">Showing {filtered.length} of {tas.length} Teaching Artists</p>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
          <p className="text-neutral-500">No teaching artists match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-200 bg-white rounded-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Name</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Onboarding</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Missing</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Doc Expiry</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Projects</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((ta) => {
                const docs = docsByTA[ta.id] || [];
                const sectionsComplete = (ta.onboarding_sections_complete || {}) as Record<string, boolean>;
                const completedSections = Object.values(sectionsComplete).filter(Boolean).length;
                const progress = Math.round((completedSections / 7) * 100);
                const missing = getMissing(ta, docs);
                const isExpanded = expandedId === ta.id;
                const taName = ta.first_name || "there";

                // Doc expiry
                const visaDoc = docs.find((d) => d.type === "visa" || d.type === "right_to_work");
                const policeDoc = docs.find((d) => d.type === "police_check");
                const visaStatus = expiryStatus(visaDoc?.expiry_date ?? null);
                const policeStatus = expiryStatus(policeDoc?.expiry_date ?? null);

                const checklist = isExpanded
                  ? getChecklist(ta, docs, prefsByTA[ta.id] || 0, availByTA[ta.id] || 0)
                  : [];
                const detailedMissing = checklist.filter((i) => !i.done);
                const taWorkOrders = workOrdersByTA[ta.id] || [];

                return (
                  <>
                    <tr
                      key={ta.id}
                      className={`cursor-pointer transition-colors ${isExpanded ? "bg-neutral-50" : "hover:bg-neutral-50"}`}
                      onClick={() => setExpandedId(isExpanded ? null : ta.id)}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg className={`h-3.5 w-3.5 shrink-0 text-neutral-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            {ta.photo_url ? (
                              <img src={ta.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                                {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-neutral-900">
                                {ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email}
                              </span>
                              <p className="text-xs text-neutral-400">{ta.email}</p>
                            </div>
                          </Link>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3 text-center"><Badge>{ta.pay_level}</Badge></td>

                      {/* Onboarding progress */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-neutral-100">
                            <div className={`h-1.5 rounded-full transition-all ${progress === 100 ? "bg-neutral-900" : progress > 0 ? "bg-neutral-400" : "bg-neutral-200"}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] text-neutral-400">{progress}%</span>
                        </div>
                      </td>

                      {/* Missing */}
                      <td className="px-4 py-3">
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {missing.length === 0 ? (
                            <Badge variant="success">Complete</Badge>
                          ) : (
                            missing.map((m) => <Badge key={m} variant="error">{m}</Badge>)
                          )}
                        </div>
                      </td>

                      {/* Doc Expiry */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {visaDoc?.expiry_date ? (
                            <p className={`text-xs ${visaStatus === "expired" ? "text-red-600 font-medium" : visaStatus === "soon" ? "text-amber-600" : "text-neutral-500"}`}>
                              Visa: {fmtDate(visaDoc.expiry_date)} {visaDoc.expiry_date.split("-")[0]}
                              {visaStatus === "expired" && " ⚠"}
                              {visaStatus === "soon" && " ↑"}
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-300">Visa: —</p>
                          )}
                          {policeDoc?.expiry_date ? (
                            <p className={`text-xs ${policeStatus === "expired" ? "text-red-600 font-medium" : policeStatus === "soon" ? "text-amber-600" : "text-neutral-500"}`}>
                              Police: {fmtDate(policeDoc.expiry_date)} {policeDoc.expiry_date.split("-")[0]}
                              {policeStatus === "expired" && " ⚠"}
                              {policeStatus === "soon" && " ↑"}
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-300">Police: —</p>
                          )}
                        </div>
                      </td>

                      {/* Projects */}
                      <td className="px-4 py-3 text-center text-sm text-neutral-500">
                        {ta.qualifying_projects}/{ta.total_projects}
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DeleteTAButton id={ta.id} name={ta.first_name ? `${ta.first_name} ${ta.last_name}` : ta.email} />
                      </td>
                    </tr>

                    {/* Accordion */}
                    {isExpanded && (
                      <tr key={`${ta.id}-exp`}>
                        <td colSpan={7} className="bg-neutral-50 px-6 pb-5 pt-1">
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                            {/* Onboarding tasks */}
                            <div>
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Onboarding Tasks</p>
                              {detailedMissing.length > 0 && (
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs text-neutral-500">{detailedMissing.length} still needed</span>
                                  <button onClick={() => nudgeAll(ta.id, detailedMissing, taName)} className="rounded-sm border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50">
                                    Nudge all
                                  </button>
                                </div>
                              )}
                              <div className="divide-y divide-neutral-100 rounded-sm border border-neutral-200 bg-white">
                                {checklist.map((item) => {
                                  const key = `${ta.id}:${item.id}`;
                                  const isSent = sentNudges.has(key);
                                  const isLoading = sendingNudge === key;
                                  return (
                                    <div key={item.id} className={`flex items-center gap-3 px-3 py-2 ${item.done ? "opacity-50" : ""}`}>
                                      {item.done ? (
                                        <svg className="h-3.5 w-3.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                      ) : (
                                        <svg className="h-3.5 w-3.5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      )}
                                      <span className={`flex-1 text-xs ${item.done ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
                                        {item.label}{item.detail ? ` (${item.detail})` : ""}
                                      </span>
                                      {!item.done && (
                                        isSent ? (
                                          <span className="text-[10px] font-medium text-green-600">Sent ✓</span>
                                        ) : (
                                          <button onClick={() => sendNudge(ta.id, item, taName)} disabled={isLoading} className="text-[10px] font-medium text-[#E91E8C] hover:underline disabled:opacity-50">
                                            {isLoading ? "…" : "Nudge"}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Projects */}
                            <div>
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                                Projects ({taWorkOrders.length})
                              </p>
                              {taWorkOrders.length === 0 ? (
                                <p className="text-xs text-neutral-400 italic">No projects yet.</p>
                              ) : (
                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                  {taWorkOrders.map((wo, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                      <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${WO_STATUS[wo.status] ?? "bg-neutral-100 text-neutral-500"}`}>
                                        {wo.status}
                                      </span>
                                      <span className="text-xs font-medium text-neutral-700 truncate">{wo.school || wo.project_name || "—"}</span>
                                      <span className="ml-auto shrink-0 text-[10px] text-neutral-400">{fmtDateRange(wo.start_date, wo.end_date)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
