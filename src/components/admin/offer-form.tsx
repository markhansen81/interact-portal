"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface OfferRate {
  id: string;
  program_type: string;
  num_days: number;
  tariff: number;
  price_pp: number;
}

export interface ProgramLine {
  program_type: string;
  grade_level: string;
  num_students: number | "";
  num_groups: number | "";
  num_tas: number | "";
  num_days: number | "";
  start_date: string;
  end_date: string;
  price_pp: number | "";
}

interface OfferData {
  school_name: string;
  contact_name: string;
  contact_email: string;
  school_address: string;
  city: string;
  postcode: string;
  state: string;
  programs: string[];
  program_type: string;
  program_lines: ProgramLine[];
  // kept for single-program backward compat (populated from first line on save)
  grade_level: string;
  num_students: number | "";
  num_groups: number | "";
  num_tas: number | "";
  num_days: number | "";
  start_date: string;
  end_date: string;
  school_year: string;
  tariff: number;
  price_pp: number | "";
  valid_until: string;
  notes: string;
  lead_id?: string;
  church_item_id?: string;
}

interface OfferFormProps {
  prefill?: Partial<OfferData> & { program_lines?: ProgramLine[] };
  rates: OfferRate[];
  offerId?: string;
}

const PROGRAM_TYPES = [
  "Native Speaker Week",
  "Theatre Week",
  "Film Week",
  "Art in Action Week",
  "Media Week",
  "Class Trip",
  "Monster Parade",
  "Kids Space Adventure",
  "Kulturtag",
  "Shakespeare Workshop",
  "Debating Skills Workshop",
  "Job Prep Workshop",
  "Test Prep Workshop",
];

const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

const inputClass =
  "w-full border border-neutral-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-black focus:ring-0";
const labelClass = "block text-sm font-medium text-neutral-700 mb-1";

function emptyLine(programType: string): ProgramLine {
  return {
    program_type: programType,
    grade_level: "",
    num_students: "",
    num_groups: "",
    num_tas: "",
    num_days: "",
    start_date: "",
    end_date: "",
    price_pp: "",
  };
}

function initProgramLines(prefill?: Partial<OfferData> & { program_lines?: ProgramLine[] }): ProgramLine[] {
  // Use existing program_lines if present and non-empty
  if (prefill?.program_lines && prefill.program_lines.length > 0) {
    return prefill.program_lines;
  }

  // Build from programs + flat fields (backward compat / new from CRM prefill)
  const programs = prefill?.programs?.length
    ? prefill.programs
    : prefill?.program_type
      ? [prefill.program_type]
      : [];

  if (programs.length === 0) return [];

  return programs.map((pt, i) =>
    i === 0
      ? {
          program_type: pt,
          grade_level: prefill?.grade_level || "",
          num_students: prefill?.num_students ?? "",
          num_groups: prefill?.num_groups ?? "",
          num_tas: prefill?.num_tas ?? "",
          num_days: prefill?.num_days ?? "",
          start_date: prefill?.start_date || "",
          end_date: prefill?.end_date || "",
          price_pp: prefill?.price_pp ?? "",
        }
      : emptyLine(pt)
  );
}

export function OfferForm({ prefill, rates, offerId }: OfferFormProps) {
  const isEdit = !!offerId;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState(prefill?.school_name || "");
  const [contactName, setContactName] = useState(prefill?.contact_name || "");
  const [contactEmail, setContactEmail] = useState(prefill?.contact_email || "");
  const [schoolAddress, setSchoolAddress] = useState(prefill?.school_address || "");
  const [city, setCity] = useState(prefill?.city || "");
  const [postcode, setPostcode] = useState(prefill?.postcode || "");
  const [state, setState] = useState(prefill?.state || "");
  const [schoolYear, setSchoolYear] = useState(prefill?.school_year || "2026/2027");
  const [tariff, setTariff] = useState(prefill?.tariff || 1);
  const [validUntil, setValidUntil] = useState(prefill?.valid_until || "");
  const [notes, setNotes] = useState(prefill?.notes || "");

  const [programs, setPrograms] = useState<string[]>(() =>
    prefill?.programs?.length
      ? prefill.programs
      : prefill?.program_type
        ? [prefill.program_type]
        : []
  );

  const [programLines, setProgramLines] = useState<ProgramLine[]>(() =>
    initProgramLines(prefill)
  );

  // Keep programLines in sync when programs checkboxes change
  function toggleProgram(p: string, checked: boolean) {
    if (checked) {
      setPrograms((prev) => [...prev, p]);
      setProgramLines((prev) => [...prev, emptyLine(p)]);
    } else {
      setPrograms((prev) => prev.filter((x) => x !== p));
      setProgramLines((prev) => prev.filter((l) => l.program_type !== p));
    }
  }

  function updateLine(index: number, field: keyof ProgramLine, value: string | number) {
    setProgramLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  // Auto-fill price when num_days or tariff changes for a line
  useEffect(() => {
    setProgramLines((prev) =>
      prev.map((line) => {
        if (!line.num_days) return line;
        const matched = rates.find(
          (r) =>
            r.program_type === line.program_type &&
            r.num_days === Number(line.num_days) &&
            r.tariff === tariff
        );
        if (matched) return { ...line, price_pp: matched.price_pp };
        return line;
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tariff]);

  function handleDaysChange(index: number, days: number | "") {
    updateLine(index, "num_days", days === "" ? "" : days);
    if (!days) return;
    const line = programLines[index];
    const matched = rates.find(
      (r) =>
        r.program_type === line.program_type &&
        r.num_days === Number(days) &&
        r.tariff === tariff
    );
    if (matched) {
      setProgramLines((prev) =>
        prev.map((l, i) =>
          i === index ? { ...l, num_days: Number(days), price_pp: matched.price_pp } : l
        )
      );
    } else {
      updateLine(index, "num_days", Number(days));
    }
  }

  function lineTotal(line: ProgramLine): number {
    if (line.price_pp === "" || line.num_students === "") return 0;
    return Number(line.price_pp) * Number(line.num_students);
  }

  const grandTotal = programLines.reduce((sum, l) => sum + lineTotal(l), 0);

  async function handleSubmit(sendAfterSave: boolean) {
    setSaving(true);
    setError(null);

    try {
      // Derive top-level flat fields from first program line (backward compat)
      const firstLine = programLines[0];
      const payload = {
        school_name: schoolName,
        contact_name: contactName,
        contact_email: contactEmail,
        school_address: schoolAddress,
        city,
        postcode,
        state,
        school_year: schoolYear,
        tariff,
        valid_until: validUntil || null,
        notes,
        programs,
        program_type: programs[0] || "",
        program_lines: programLines.map((l) => ({
          ...l,
          num_students: l.num_students !== "" ? Number(l.num_students) : null,
          num_groups: l.num_groups !== "" ? Number(l.num_groups) : null,
          num_tas: l.num_tas !== "" ? Number(l.num_tas) : null,
          num_days: l.num_days !== "" ? Number(l.num_days) : null,
          price_pp: l.price_pp !== "" ? Number(l.price_pp) : null,
          total: lineTotal(l) || null,
        })),
        // Flat fields from first line
        grade_level: firstLine?.grade_level || null,
        num_students: firstLine?.num_students !== "" ? Number(firstLine?.num_students) : null,
        num_groups: firstLine?.num_groups !== "" ? Number(firstLine?.num_groups) : null,
        num_tas: firstLine?.num_tas !== "" ? Number(firstLine?.num_tas) : null,
        num_days: firstLine?.num_days !== "" ? Number(firstLine?.num_days) : null,
        start_date: firstLine?.start_date || null,
        end_date: firstLine?.end_date || null,
        price_pp: firstLine?.price_pp !== "" ? Number(firstLine?.price_pp) : null,
        total: grandTotal || null,
        lead_id: prefill?.lead_id,
        church_item_id: prefill?.church_item_id,
      };

      let id = offerId;

      if (isEdit) {
        const res = await fetch(`/api/admin/offers/${offerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update offer");
        }
      } else {
        const res = await fetch("/api/admin/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save offer");
        }
        const created = await res.json();
        id = created.id;
      }

      if (sendAfterSave && id) {
        await fetch(`/api/admin/offers/${id}/send`, { method: "POST" });
      }

      router.push(`/admin/offers/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}
      className="max-w-3xl space-y-6"
    >
      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* School info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          School Information
        </h3>

        <div>
          <label className={labelClass}>School Name *</label>
          <input
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>School Address</label>
          <input
            type="text"
            value={schoolAddress}
            onChange={(e) => setSchoolAddress(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Postcode</label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={inputClass}
          >
            <option value="">Select state...</option>
            {BUNDESLAENDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Program selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Programs
        </h3>
        <p className="text-xs text-neutral-400">
          Select each program. Each gets its own section below with separate student counts and pricing.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROGRAM_TYPES.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={programs.includes(p)}
                onChange={(e) => toggleProgram(p, e.target.checked)}
                className="rounded-sm border-neutral-300"
              />
              {p}
            </label>
          ))}
        </div>
      </div>

      {/* Tariff (global) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Tariff</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="tariff"
            checked={tariff === 1}
            onChange={() => setTariff(1)}
            className="accent-neutral-900"
          />
          Tarif 1 — Schule stellt Homestay
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="tariff"
            checked={tariff === 2}
            onChange={() => setTariff(2)}
            className="accent-neutral-900"
          />
          Tarif 2 — InterACT übernimmt Übernachtung
        </label>
      </div>

      {/* Per-program line items */}
      {programLines.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Program Details
          </h3>
          {programLines.map((line, idx) => {
            const sub = lineTotal(line);
            return (
              <div
                key={line.program_type}
                className="rounded-lg border border-neutral-200 overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-pink inline-block" style={{ backgroundColor: "#e91e8c" }} />
                    <span className="text-sm font-semibold text-neutral-800">{line.program_type}</span>
                  </div>
                  {sub > 0 && (
                    <span className="text-sm font-medium text-neutral-600">
                      Subtotal: €{sub.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className={labelClass}>Grade Level</label>
                    <input
                      type="text"
                      placeholder="e.g. 5-9"
                      value={line.grade_level}
                      onChange={(e) => updateLine(idx, "grade_level", e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Students</label>
                      <input
                        type="number"
                        value={line.num_students}
                        onChange={(e) =>
                          updateLine(idx, "num_students", e.target.value ? Number(e.target.value) : "")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Groups</label>
                      <input
                        type="number"
                        value={line.num_groups}
                        onChange={(e) =>
                          updateLine(idx, "num_groups", e.target.value ? Number(e.target.value) : "")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>TAs</label>
                      <input
                        type="number"
                        value={line.num_tas}
                        onChange={(e) =>
                          updateLine(idx, "num_tas", e.target.value ? Number(e.target.value) : "")
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Number of Days</label>
                      <select
                        value={line.num_days}
                        onChange={(e) =>
                          handleDaysChange(idx, e.target.value ? Number(e.target.value) : "")
                        }
                        className={inputClass}
                      >
                        <option value="">Select...</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>
                        Price per Student
                        {rates.some(
                          (r) =>
                            r.program_type === line.program_type &&
                            r.num_days === Number(line.num_days) &&
                            r.tariff === tariff
                        ) && (
                          <span className="ml-2 text-xs text-neutral-400 font-normal">
                            (auto-filled)
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.price_pp}
                        onChange={(e) =>
                          updateLine(idx, "price_pp", e.target.value ? Number(e.target.value) : "")
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Start Date</label>
                      <input
                        type="date"
                        value={line.start_date}
                        onChange={(e) => updateLine(idx, "start_date", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>End Date</label>
                      <input
                        type="date"
                        value={line.end_date}
                        onChange={(e) => updateLine(idx, "end_date", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {programs.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-6 text-center text-sm text-neutral-400">
          Select at least one program above to fill in details.
        </div>
      )}

      {/* Other fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Other
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>School Year</label>
            <input
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Grand total */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-500">Total</span>
          <span className="text-3xl font-light tracking-tight text-neutral-900">
            {grandTotal > 0
              ? `€${grandTotal.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
              : "—"}
          </span>
        </div>
        {programLines.length > 1 && grandTotal > 0 && (
          <div className="mt-2 space-y-0.5">
            {programLines.map((l) => {
              const sub = lineTotal(l);
              if (!sub) return null;
              return (
                <div key={l.program_type} className="flex justify-between text-xs text-neutral-400">
                  <span>{l.program_type}</span>
                  <span>
                    €{Number(l.price_pp).toFixed(2)} × {l.num_students} = €{sub.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Offer" : "Save Draft"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => handleSubmit(true)}
        >
          {isEdit ? "Update & Resend" : "Save & Send"}
        </Button>
      </div>
    </form>
  );
}
