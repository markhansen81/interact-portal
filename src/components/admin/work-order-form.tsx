"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  pay_level: number;
  camp_level: number;
}

interface PayScale {
  id: string;
  scale_type: string;
  level: number;
  level_label: string;
  rates: Record<string, number | null>;
}

const PROGRAM_TYPES = [
  "Native Speaker Week",
  "Art in Action Week",
  "Theatre Week",
  "Film Week",
  "Media Week",
  "Class Trip",
  "Test Prep",
  "Shakespeare Workshop",
  "Debate Workshop",
  "Job & Presentation Skills",
  "Monster Parade",
  "Kids Space Adventure",
  "Global Speaker Week",
  "Kulturtag",
  "Holiday Camp",
];

export function WorkOrderForm({
  tas,
  payScales,
}: {
  tas: TA[];
  payScales: PayScale[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    ta_id: "",
    project_name: "",
    school: "",
    school_address: "",
    school_state: "",
    location: "",
    start_date: "",
    end_date: "",
    days: 1,
    program_type: "",
    special_conditions: "",
    co_taught: false,
    grade: "",
    accommodation: "",
    notes: "",
  });

  const selectedTA = tas.find((t) => t.id === form.ta_id);

  const iscamp = form.program_type.toLowerCase().includes("camp");

  const calculatedRate = useMemo(() => {
    if (!selectedTA || !form.days) return null;

    const scaleType = iscamp ? "camps" : "programs";
    const level = iscamp ? selectedTA.camp_level : selectedTA.pay_level;

    const scale = payScales.find(
      (s) => s.scale_type === scaleType && s.level === level
    );

    if (!scale) return null;

    const rate = scale.rates[String(form.days)];
    return rate;
  }, [selectedTA, form.days, form.program_type, payScales, iscamp]);

  function update(field: string, value: string | number | boolean) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        daily_rate: calculatedRate ? calculatedRate / form.days : null,
        total: calculatedRate,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create");
      setLoading(false);
      return;
    }

    router.push("/admin/work-orders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* TA Selection */}
      <Section title="Teaching Artist">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Select Teaching Artist</Label>
            <select
              value={form.ta_id}
              onChange={(e) => update("ta_id", e.target.value)}
              required
              className="input"
            >
              <option value="">Choose a TA...</option>
              {tas.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.first_name && ta.last_name
                    ? `${ta.first_name} ${ta.last_name}`
                    : ta.email}{" "}
                  — Level {ta.pay_level} (Camp: {ta.camp_level})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Project Details */}
      <Section title="Project Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Project Name</Label>
            <input
              value={form.project_name}
              onChange={(e) => update("project_name", e.target.value)}
              required
              className="input"
              placeholder="e.g. NSw - Grundschule Berlin Mitte"
            />
          </div>
          <div>
            <Label>Program Type</Label>
            <select
              value={form.program_type}
              onChange={(e) => update("program_type", e.target.value)}
              required
              className="input"
            >
              <option value="">Select...</option>
              {PROGRAM_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Number of Days</Label>
            <input
              type="number"
              min={1}
              max={7}
              value={form.days}
              onChange={(e) => update("days", parseInt(e.target.value))}
              required
              className="input"
            />
          </div>
          <div>
            <Label>Start Date</Label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              required
              className="input"
            />
          </div>
          <div>
            <Label>End Date</Label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => update("end_date", e.target.value)}
              required
              className="input"
            />
          </div>
        </div>
      </Section>

      {/* School / Location */}
      <Section title="Organisation (Workplace)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>School / Organisation Name</Label>
            <input
              value={form.school}
              onChange={(e) => update("school", e.target.value)}
              className="input"
            />
          </div>
          <div>
            <Label>Location (City)</Label>
            <input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="input"
            />
          </div>
          <div>
            <Label>Address</Label>
            <input
              value={form.school_address}
              onChange={(e) => update("school_address", e.target.value)}
              className="input"
            />
          </div>
          <div>
            <Label>State (Bundesland)</Label>
            <input
              value={form.school_state}
              onChange={(e) => update("school_state", e.target.value)}
              className="input"
            />
          </div>
        </div>
      </Section>

      {/* Additional Details */}
      <Section title="Additional Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Grade / Year</Label>
            <input
              value={form.grade}
              onChange={(e) => update("grade", e.target.value)}
              className="input"
              placeholder="e.g. Grades 5-7"
            />
          </div>
          <div>
            <Label>Accommodation</Label>
            <input
              value={form.accommodation}
              onChange={(e) => update("accommodation", e.target.value)}
              className="input"
              placeholder="e.g. Hotel Ibis, shared room"
            />
          </div>
          <div className="col-span-2">
            <Label>Special Conditions</Label>
            <textarea
              value={form.special_conditions}
              onChange={(e) => update("special_conditions", e.target.value)}
              className="input"
              rows={2}
              placeholder="Any special conditions for this work order..."
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.co_taught}
                onChange={(e) => update("co_taught", e.target.checked)}
                className="rounded"
              />
              Co-taught
            </label>
          </div>
        </div>
      </Section>

      {/* Rate Calculation */}
      <Section title="Remuneration">
        <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
          {selectedTA && calculatedRate !== null ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-500">
                {selectedTA.first_name} {selectedTA.last_name} —{" "}
                {iscamp ? `Camp Level ${selectedTA.camp_level}` : `Level ${selectedTA.pay_level}`}
              </p>
              <p className="text-sm text-zinc-500">
                {form.program_type} — {form.days} day{form.days > 1 ? "s" : ""}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {calculatedRate != null ? `€${calculatedRate.toFixed(2)}` : "Rate TBD for this level"}
              </p>
              <p className="text-xs text-zinc-400">
                Auto-calculated from 2025 pay scale. Additional wages (Theatre/Film Week, travel stipend, etc.) handled in invoice.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Select a TA and program type to calculate rate.
            </p>
          )}
        </div>
      </Section>

      {/* Notes */}
      <div>
        <Label>Internal Notes (not shown to TA)</Label>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="input"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Preview & Submit */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            type="submit"
            name="action"
            value="draft"
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            name="action"
            value="send"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Creating..." : "Create & Send to TA"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
      {children}
    </label>
  );
}
