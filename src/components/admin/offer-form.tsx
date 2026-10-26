"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface OfferRate {
  id: string;
  program_type: string;
  num_days: number;
  tariff: number;
  price_pp: number;
}

interface OfferData {
  school_name: string;
  contact_name: string;
  contact_email: string;
  school_address: string;
  city: string;
  postcode: string;
  state: string;
  program_type: string;
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
  prefill?: Partial<OfferData>;
  rates: OfferRate[];
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
  "Baden-W\u00fcrttemberg",
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
  "Th\u00fcringen",
];

const inputClass =
  "w-full border border-neutral-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-black focus:ring-0";
const labelClass = "block text-sm font-medium text-neutral-700 mb-1";

export function OfferForm({ prefill, rates }: OfferFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OfferData>({
    school_name: "",
    contact_name: "",
    contact_email: "",
    school_address: "",
    city: "",
    postcode: "",
    state: "",
    program_type: "",
    grade_level: "",
    num_students: "",
    num_groups: "",
    num_tas: "",
    num_days: "",
    start_date: "",
    end_date: "",
    school_year: "2026/2027",
    tariff: 1,
    price_pp: "",
    valid_until: "",
    notes: "",
    ...prefill,
  });

  // Auto-lookup rate when program_type, num_days, or tariff changes
  const matchedRate = useMemo(() => {
    if (!form.program_type || !form.num_days) return null;
    return rates.find(
      (r) =>
        r.program_type === form.program_type &&
        r.num_days === Number(form.num_days) &&
        r.tariff === form.tariff
    );
  }, [form.program_type, form.num_days, form.tariff, rates]);

  useEffect(() => {
    if (matchedRate) {
      setForm((prev) => ({ ...prev, price_pp: matchedRate.price_pp }));
    }
  }, [matchedRate]);

  const total =
    form.price_pp !== "" && form.num_students !== ""
      ? Number(form.price_pp) * Number(form.num_students)
      : 0;

  function update(field: keyof OfferData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(sendAfterSave: boolean) {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        num_students: form.num_students !== "" ? Number(form.num_students) : null,
        num_groups: form.num_groups !== "" ? Number(form.num_groups) : null,
        num_tas: form.num_tas !== "" ? Number(form.num_tas) : null,
        num_days: form.num_days !== "" ? Number(form.num_days) : null,
        price_pp: form.price_pp !== "" ? Number(form.price_pp) : null,
        total: total || null,
      };

      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save offer");
      }

      const { id } = await res.json();

      if (sendAfterSave) {
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
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(false);
      }}
      className="max-w-2xl space-y-6"
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
            value={form.school_name}
            onChange={(e) => update("school_name", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Contact Name</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => update("contact_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => update("contact_email", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>School Address</label>
          <input
            type="text"
            value={form.school_address}
            onChange={(e) => update("school_address", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Postcode</label>
            <input
              type="text"
              value={form.postcode}
              onChange={(e) => update("postcode", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>State</label>
          <select
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            className={inputClass}
          >
            <option value="">Select state...</option>
            {BUNDESLAENDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Program details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Program Details
        </h3>

        <div>
          <label className={labelClass}>Program Type</label>
          <select
            value={form.program_type}
            onChange={(e) => update("program_type", e.target.value)}
            className={inputClass}
          >
            <option value="">Select program...</option>
            {PROGRAM_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Grade Level</label>
          <input
            type="text"
            placeholder="e.g. 5-9"
            value={form.grade_level}
            onChange={(e) => update("grade_level", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Number of Students</label>
            <input
              type="number"
              value={form.num_students}
              onChange={(e) =>
                update("num_students", e.target.value ? Number(e.target.value) : "")
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Number of Groups</label>
            <input
              type="number"
              value={form.num_groups}
              onChange={(e) =>
                update("num_groups", e.target.value ? Number(e.target.value) : "")
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Number of TAs</label>
            <input
              type="number"
              value={form.num_tas}
              onChange={(e) =>
                update("num_tas", e.target.value ? Number(e.target.value) : "")
              }
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Number of Days</label>
          <select
            value={form.num_days}
            onChange={(e) =>
              update("num_days", e.target.value ? Number(e.target.value) : "")
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => update("end_date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>School Year</label>
          <input
            type="text"
            value={form.school_year}
            onChange={(e) => update("school_year", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Pricing
        </h3>

        <div>
          <label className={labelClass}>Tariff</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tariff"
                value={1}
                checked={form.tariff === 1}
                onChange={() => update("tariff", 1)}
                className="accent-neutral-900"
              />
              Tarif 1 — Schule stellt Homestay
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tariff"
                value={2}
                checked={form.tariff === 2}
                onChange={() => update("tariff", 2)}
                className="accent-neutral-900"
              />
              Tarif 2 — InterACT übernimmt Übernachtung
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Price per Student
              {matchedRate && (
                <span className="ml-2 text-xs text-neutral-400 font-normal">
                  (auto-filled from rates)
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              value={form.price_pp}
              onChange={(e) =>
                update("price_pp", e.target.value ? Number(e.target.value) : "")
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Total</label>
            <input
              type="text"
              readOnly
              value={
                total
                  ? `\u20AC${total.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                  : "-"
              }
              className={`${inputClass} bg-neutral-50 text-neutral-600`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Valid Until</label>
          <input
            type="date"
            value={form.valid_until}
            onChange={(e) => update("valid_until", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => handleSubmit(true)}
        >
          Save & Send
        </Button>
      </div>
    </form>
  );
}
