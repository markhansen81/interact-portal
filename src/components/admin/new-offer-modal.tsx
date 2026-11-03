"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface ChurchItem {
  id: string;
  name: string;
  school_name: string | null;
  source: "opportunity" | "project" | "lead";
  deal_stage: string | null;
  opp_status: string | null;
  program_type: string | null;
  programs?: string[] | null;
  num_students: number | null;
  num_groups: number | null;
  num_days: number | null;
  num_tas: number | null;
  price_pp: number | null;
  grade_level: string | null;
  city: string | null;
  state: string | null;
  street: string | null;
  postcode?: string | null;
  contact_email: string | null;
  teacher_contact: string | null;
  start_date: string | null;
  end_date: string | null;
  lead_id?: string | null;
}

interface NewOfferModalProps {
  onClose: () => void;
}

export function NewOfferModal({ onClose }: NewOfferModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [items, setItems] = useState<ChurchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ChurchItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/church/items")
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (step === "pick") inputRef.current?.focus();
  }, [step]);

  const filtered = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const name = (item.school_name || item.name || "").toLowerCase();
    const prog = (item.program_type || "").toLowerCase();
    const city = (item.city || "").toLowerCase();
    return name.includes(q) || prog.includes(q) || city.includes(q);
  });

  const leadItems = filtered.filter((i) => i.source === "lead");
  const oppItems = filtered.filter((i) => i.source === "opportunity");
  const projectItems = filtered.filter((i) => i.source === "project");

  async function createOffer(sendAfter: boolean) {
    setCreating(true);
    setError(null);
    const body = selected
      ? {
          ...(selected.source === "lead"
            ? { lead_id: selected.lead_id || selected.id }
            : { church_item_id: selected.id }),
          school_name: selected.school_name || selected.name,
          contact_name: selected.teacher_contact,
          contact_email: selected.contact_email,
          school_address: selected.street,
          postcode: selected.postcode,
          city: selected.city,
          state: selected.state,
          program_type: selected.program_type,
          programs: selected.programs?.length
            ? selected.programs
            : selected.program_type ? [selected.program_type] : [],
          num_students: selected.num_students,
          num_groups: selected.num_groups,
          num_tas: selected.num_tas,
          num_days: selected.num_days,
          grade_level: selected.grade_level,
          price_pp: selected.price_pp,
          start_date: selected.start_date,
          end_date: selected.end_date,
        }
      : {};

    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");

      const offerId = data.id;
      if (sendAfter) {
        router.push(`/admin/offers/${offerId}?action=send`);
      } else {
        router.push(`/admin/offers/${offerId}`);
      }
    } catch (e: any) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">New Offer</h2>
            {step === "pick" && (
              <p className="text-xs text-neutral-400 mt-0.5">Select a CRM lead or opportunity to pre-fill</p>
            )}
            {step === "confirm" && selected && (
              <p className="text-xs text-neutral-400 mt-0.5">
                Creating offer for <span className="font-medium text-neutral-700">{selected.school_name || selected.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1 — Pick */}
        {step === "pick" && (
          <>
            <div className="px-6 py-3 border-b border-neutral-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search school, program, city…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {!loading && (
                <div className="grid grid-cols-[14px_1fr_160px_180px_160px] gap-x-4 px-6 py-1.5 border-b border-neutral-100 bg-neutral-50">
                  <div />
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">School</p>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Contact</p>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Email</p>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Program</p>
                </div>
              )}
              {loading ? (
                <div className="px-6 py-8 text-center text-sm text-neutral-400">Loading CRM…</div>
              ) : (
                <>
                  {leadItems.length > 0 && (
                    <div>
                      <div className="sticky top-0 bg-neutral-50 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                        Leads ({leadItems.length})
                      </div>
                      {leadItems.map((item) => (
                        <ItemRow key={item.id} item={item} onSelect={() => { setSelected(item); setStep("confirm"); }} />
                      ))}
                    </div>
                  )}
                  {oppItems.length > 0 && (
                    <div>
                      <div className="sticky top-0 bg-neutral-50 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                        Opportunities ({oppItems.length})
                      </div>
                      {oppItems.map((item) => (
                        <ItemRow key={item.id} item={item} onSelect={() => { setSelected(item); setStep("confirm"); }} />
                      ))}
                    </div>
                  )}
                  {projectItems.length > 0 && (
                    <div>
                      <div className="sticky top-0 bg-neutral-50 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 border-b border-neutral-100">
                        Projects ({projectItems.length})
                      </div>
                      {projectItems.map((item) => (
                        <ItemRow key={item.id} item={item} onSelect={() => { setSelected(item); setStep("confirm"); }} />
                      ))}
                    </div>
                  )}
                  {leadItems.length === 0 && oppItems.length === 0 && projectItems.length === 0 && (
                    <div className="px-6 py-8 text-center text-sm text-neutral-400">
                      {query ? "No matches found." : "No CRM items loaded."}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Blank offer option */}
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Don&apos;t see the lead?</span>
              <button
                onClick={() => { setSelected(null); setStep("confirm"); }}
                className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors"
              >
                Start with blank offer →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Confirm */}
        {step === "confirm" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {selected ? (
                <>
                  <div className="rounded-lg border border-neutral-200 overflow-hidden">
                    <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-100">
                      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Pre-filled from CRM</p>
                    </div>
                    <div className="divide-y divide-neutral-50">
                      <ConfirmRow label="School" value={selected.school_name || selected.name} />
                      <ConfirmRow label="Contact email" value={selected.contact_email} />
                      <ConfirmRow label="Contact name" value={selected.teacher_contact} />
                      <ConfirmRow label="City" value={[selected.city, selected.state].filter(Boolean).join(", ")} />
                      <ConfirmRow label="Program" value={
                        selected.programs?.length
                          ? selected.programs.join(", ")
                          : selected.program_type
                      } />
                      <ConfirmRow label="Students" value={selected.num_students?.toString()} />
                      <ConfirmRow label="Groups" value={selected.num_groups?.toString()} />
                      <ConfirmRow label="Days" value={selected.num_days?.toString()} />
                      <ConfirmRow label="Grade level" value={selected.grade_level} />
                      {selected.price_pp && <ConfirmRow label="Price/student" value={`€${selected.price_pp}`} />}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400">You&apos;ll be able to edit all fields after creation.</p>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-8 text-center">
                  <p className="text-sm text-neutral-500">Starting a blank offer — all fields will be empty.</p>
                  <p className="text-xs text-neutral-400 mt-1">You can fill in all details on the offer page.</p>
                </div>
              )}
              {error && (
                <div className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50">
              <button
                onClick={() => { setStep("pick"); setError(null); }}
                className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createOffer(false)}
                  disabled={creating}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creating…" : "Create Draft"}
                </button>
                <button
                  onClick={() => createOffer(true)}
                  disabled={creating}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creating…" : "Create & Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ItemRow({ item, onSelect }: { item: ChurchItem; onSelect: () => void }) {
  const stage = item.opp_status || item.deal_stage;
  const dotColor =
    item.source === "lead" ? "bg-amber-400" :
    item.source === "opportunity" ? "bg-blue-400" : "bg-green-400";
  const program = item.programs?.length
    ? item.programs.slice(0, 2).join(", ") + (item.programs.length > 2 ? ` +${item.programs.length - 2}` : "")
    : item.program_type;
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-6 py-3 border-b border-neutral-50 hover:bg-blue-50 transition-colors flex items-center justify-between group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <div className="grid grid-cols-[1fr_160px_180px_160px] gap-x-4 min-w-0 flex-1 items-center">
          <p className="text-sm font-medium text-neutral-900 truncate">{item.school_name || item.name}</p>
          <p className="text-xs text-neutral-500 truncate">{item.teacher_contact || "—"}</p>
          <p className="text-xs text-neutral-400 truncate">{item.contact_email || "—"}</p>
          <p className="text-xs text-neutral-400 truncate">{program || "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {stage && (
          <span className="text-xs text-neutral-300">{stage}</span>
        )}
        <svg className="h-4 w-4 text-neutral-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function ConfirmRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline px-4 py-2">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-sm text-neutral-800">{value || <span className="text-neutral-300 italic">—</span>}</span>
    </div>
  );
}
