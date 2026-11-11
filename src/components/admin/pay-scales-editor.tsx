"use client";

import { useState } from "react";

interface PayScale {
  id: string;
  scale_type: string;
  level: number;
  level_label: string;
  min_projects: number | null;
  rates: Record<string, number | null>;
}

function RateInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm font-mono focus:border-black focus:outline-none"
      min={0}
    />
  );
}

export function PayScalesEditor({ payScales }: { payScales: PayScale[] }) {
  const [scales, setScales] = useState(payScales);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Group by scale_type
  const types = Array.from(new Set(scales.map((s) => s.scale_type)));

  function updateRate(id: string, day: string, value: number | null) {
    setScales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, rates: { ...s.rates, [day]: value } } : s))
    );
  }

  async function saveRow(id: string) {
    const scale = scales.find((s) => s.id === id);
    if (!scale) return;

    setSaving(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`/api/admin/pay-scales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates: scale.rates, level_label: scale.level_label, min_projects: scale.min_projects }),
    });

    setSaving(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrors((prev) => ({ ...prev, [id]: json.error || "Save failed" }));
    } else {
      setSaved(id);
      setTimeout(() => setSaved((prev) => (prev === id ? null : prev)), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {types.map((type) => {
        const rows = scales.filter((s) => s.scale_type === type);
        const dayCols = Array.from(new Set(rows.flatMap((r) => Object.keys(r.rates)))).sort((a, b) => Number(a) - Number(b));

        return (
          <div key={type}>
            <h3 className="mb-2 text-sm font-semibold capitalize text-neutral-700">{type}</h3>
            <div className="overflow-x-auto rounded-sm border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Level</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Label</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Min Projects</th>
                    {dayCols.map((d) => (
                      <th key={d} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {d}d Rate (€)
                      </th>
                    ))}
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {rows.map((scale) => (
                    <tr key={scale.id} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium text-neutral-900">{scale.level}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={scale.level_label}
                          onChange={(e) =>
                            setScales((prev) =>
                              prev.map((s) => (s.id === scale.id ? { ...s, level_label: e.target.value } : s))
                            )
                          }
                          className="w-48 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-black focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={scale.min_projects ?? ""}
                          onChange={(e) =>
                            setScales((prev) =>
                              prev.map((s) =>
                                s.id === scale.id
                                  ? { ...s, min_projects: e.target.value === "" ? null : Number(e.target.value) }
                                  : s
                              )
                            )
                          }
                          className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm font-mono focus:border-black focus:outline-none"
                          min={0}
                        />
                      </td>
                      {dayCols.map((d) => (
                        <td key={d} className="px-4 py-2">
                          <RateInput
                            value={scale.rates[d] ?? null}
                            onChange={(v) => updateRate(scale.id, d, v)}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {errors[scale.id] && (
                            <span className="text-xs text-red-600">{errors[scale.id]}</span>
                          )}
                          {saved === scale.id && (
                            <span className="text-xs text-green-600">Saved</span>
                          )}
                          <button
                            onClick={() => saveRow(scale.id)}
                            disabled={saving === scale.id}
                            className="rounded-sm border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                          >
                            {saving === scale.id ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
