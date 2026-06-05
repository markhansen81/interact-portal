"use client";

import { useState } from "react";
import Link from "next/link";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
  pay_level: number;
  training_online: boolean;
  training_offline: boolean;
  bio: string | null;
  superpower: string | null;
  hometown_city: string | null;
  hometown_country: string | null;
  moved_to_germany: string | null;
  favourite_food: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  gender: string | null;
  pronouns: string | null;
  iban: string | null;
  bank_name: string | null;
  tax_number: string | null;
  homestay_willing: boolean | null;
}

interface MissingItem {
  id: string;
  label: string;
  category: "document" | "profile" | "training" | "availability";
}

type Filter = "all" | "incomplete" | "complete";

const REQUIRED_DOCS = ["right_to_work", "police_check", "measles", "first_aid"];
const DOC_LABELS: Record<string, string> = {
  right_to_work: "Right to Work", police_check: "Police Check",
  measles: "Measles Vaccination", first_aid: "First Aid",
};

function getMissingItems(ta: TA, docs: Record<string, string>, prefsCount: number, availCount: number): MissingItem[] {
  const missing: MissingItem[] = [];

  // Personal details
  const personalFields = ["first_name", "last_name", "phone", "date_of_birth", "nationality", "street", "city", "postal_code", "gender", "pronouns"] as const;
  const personalMissing = personalFields.filter((f) => !ta[f]);
  if (personalMissing.length > 0) missing.push({ id: "personal", label: `Personal Details (${personalFields.length - personalMissing.length}/${personalFields.length})`, category: "profile" });

  // Payroll
  if (!ta.iban || !ta.bank_name || !ta.tax_number) missing.push({ id: "payroll", label: "Payroll & Banking", category: "profile" });

  // School profile
  const schoolFields = ["bio", "superpower", "hometown_city", "hometown_country", "moved_to_germany", "favourite_food"] as const;
  const schoolMissing = schoolFields.filter((f) => !ta[f]);
  if (schoolMissing.length > 0) missing.push({ id: "school", label: `School Profile (${schoolFields.length - schoolMissing.length}/${schoolFields.length})`, category: "profile" });

  // Photo
  if (!ta.photo_url) missing.push({ id: "photo", label: "Profile Photo", category: "profile" });

  // Programs
  if (prefsCount < 29) missing.push({ id: "programs", label: `Programs (${prefsCount}/29)`, category: "profile" });

  // Documents
  for (const docType of REQUIRED_DOCS) {
    const status = docs[docType];
    if (!status || status === "not_uploaded") {
      missing.push({ id: `doc_${docType}`, label: DOC_LABELS[docType], category: "document" });
    }
  }

  // Training
  if (!ta.training_online) missing.push({ id: "training_online", label: "Online Onboarding", category: "training" });
  if (!ta.training_offline) missing.push({ id: "training_offline", label: "Offline Foundation", category: "training" });

  // Availability
  if (availCount === 0) missing.push({ id: "availability", label: "Set Availability", category: "availability" });

  return missing;
}

export function OnboardingBoard({
  tas,
  docsByTA,
  prefsByTA,
  availByTA,
}: {
  tas: TA[];
  docsByTA: Record<string, Record<string, string>>;
  prefsByTA: Record<string, number>;
  availByTA: Record<string, number>;
}) {
  const [filter, setFilter] = useState<Filter>("incomplete");
  const [search, setSearch] = useState("");
  const [sendingNudge, setSendingNudge] = useState<string | null>(null);
  const [sentNudges, setSentNudges] = useState<Set<string>>(new Set());

  // Build per-TA missing items
  const taData = tas.map((ta) => ({
    ta,
    missing: getMissingItems(ta, docsByTA[ta.id] || {}, prefsByTA[ta.id] || 0, availByTA[ta.id] || 0),
  }));

  const completeTAs = taData.filter((t) => t.missing.length === 0);
  const incompleteTAs = taData.filter((t) => t.missing.length > 0);

  let filtered = filter === "complete" ? completeTAs : filter === "incomplete" ? incompleteTAs : taData;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((t) => {
      const name = `${t.ta.first_name || ""} ${t.ta.last_name || ""} ${t.ta.email}`.toLowerCase();
      return name.includes(q);
    });
  }

  // Sort: most missing items first
  filtered.sort((a, b) => b.missing.length - a.missing.length);

  async function sendNudge(taId: string, item: MissingItem) {
    const key = `${taId}:${item.id}`;
    setSendingNudge(key);

    const ta = tas.find((t) => t.id === taId);
    const taName = ta?.first_name || "there";
    const messages: Record<string, string> = {
      document: `Hi ${taName}, please upload your ${item.label} as soon as possible so we can get you cleared for projects.`,
      profile: `Hi ${taName}, your ${item.label} is incomplete. Please finish it in the portal.`,
      training: `Hi ${taName}, please complete your ${item.label} to be eligible for work orders.`,
      availability: `Hi ${taName}, please update your availability so we can assign you to projects.`,
    };

    await fetch("/api/admin/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ta_id: taId, item: item.label, message: messages[item.category] }),
    });

    setSendingNudge(null);
    setSentNudges((prev) => new Set(prev).add(key));
  }

  async function nudgeAll(taId: string, items: MissingItem[]) {
    for (const item of items) {
      await sendNudge(taId, item);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary + filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          {([
            { id: "incomplete" as Filter, label: `Incomplete (${incompleteTAs.length})`, color: "amber" },
            { id: "complete" as Filter, label: `Complete (${completeTAs.length})`, color: "green" },
            { id: "all" as Filter, label: `All (${tas.length})`, color: "zinc" },
          ]).map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${
                filter === f.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search TAs..."
          className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
        />
      </div>

      {/* TA cards */}
      <div className="space-y-4">
        {filtered.map(({ ta, missing }) => {
          const name = ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email;
          const initials = [ta.first_name?.[0], ta.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
          const isComplete = missing.length === 0;

          return (
            <div key={ta.id} className={`overflow-hidden rounded-2xl border shadow-sm ${
              isComplete
                ? "border-green-200/80 bg-green-50/30 dark:border-green-800/50 dark:bg-green-900/5"
                : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}>
              {/* TA header */}
              <div className="flex items-center gap-4 px-6 py-4">
                <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {ta.photo_url ? (
                    <img src={ta.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
                    <p className="text-[11px] text-zinc-400">Level {ta.pay_level} · {ta.email}</p>
                  </div>
                </Link>

                {isComplete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Complete
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-600">{missing.length} missing</span>
                    <button
                      onClick={() => nudgeAll(ta.id, missing)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      Nudge all
                    </button>
                  </div>
                )}
              </div>

              {/* Missing items */}
              {missing.length > 0 && (
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-wrap gap-2 px-6 py-3">
                    {missing.map((item) => {
                      const key = `${ta.id}:${item.id}`;
                      const isSent = sentNudges.has(key);
                      const isLoading = sendingNudge === key;

                      return (
                        <div key={item.id} className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-1 dark:border-zinc-700 dark:bg-zinc-800">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.category === "document" ? "bg-blue-500" :
                            item.category === "training" ? "bg-purple-500" :
                            item.category === "availability" ? "bg-amber-500" : "bg-zinc-400"
                          }`} />
                          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                          {isSent ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Sent</span>
                          ) : (
                            <button
                              onClick={() => sendNudge(ta.id, item)}
                              disabled={isLoading}
                              className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-600"
                            >
                              {isLoading ? "..." : "Nudge"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500">No TAs match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
