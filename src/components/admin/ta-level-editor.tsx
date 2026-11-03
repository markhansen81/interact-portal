"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Level formula (qualifying projects only):
 * main_level = ceil(qualifying / 3)
 * sub_level  = ((qualifying - 1) % 3) + 1  → .1 / .2 / .3
 * e.g. 9 projects → main=3, sub=3 → 3.3
 */
function calcSuggestedLevel(qualifying: number): number | null {
  if (qualifying <= 0) return null;
  const main = Math.ceil(qualifying / 3);
  const sub = ((qualifying - 1) % 3) + 1;
  return parseFloat(`${main}.${sub}`);
}

export function TALevelEditor({
  taId,
  currentLevel,
  qualifyingProjects,
}: {
  taId: string;
  currentLevel: number;
  qualifyingProjects: number;
}) {
  const [level, setLevel] = useState(currentLevel || 0);
  const [input, setInput] = useState(currentLevel ? String(currentLevel) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const suggested = calcSuggestedLevel(qualifyingProjects);

  async function save(newLevel: number) {
    if (!newLevel || isNaN(newLevel)) return;
    setSaving(true);
    setSaved(false);
    setLevel(newLevel);
    await fetch(`/api/admin/teaching-artists/${taId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pay_level: newLevel }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function applyInput() {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && parsed > 0) save(parsed);
  }

  return (
    <div>
      {/* Current level display */}
      {level === 0
        ? <p className="text-3xl font-bold text-neutral-300">TBC</p>
        : <p className="text-5xl font-bold text-neutral-900 tabular-nums">{level.toFixed(1)}</p>}
      <p className="text-xs text-neutral-400 mt-0.5 mb-4">{level === 0 ? "Not yet set" : "Current level"}</p>

      {/* Suggested level from projects + PD */}
      {suggested !== null && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-100 px-3 py-2.5">
          <p className="text-xs text-blue-600 font-medium">
            Calculated: <span className="text-blue-800 font-bold">{suggested.toFixed(1)}</span>
          </p>
          <p className="text-[11px] text-blue-400 mt-0.5">
            {qualifyingProjects} qualifying projects
          </p>
          {suggested !== level && (
            <button
              onClick={() => { setInput(String(suggested)); save(suggested); }}
              className="mt-1.5 text-[11px] text-blue-600 font-medium hover:underline"
            >
              Apply suggested level →
            </button>
          )}
        </div>
      )}

      {/* Manual input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          min="0"
          max="9.9"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyInput()}
          placeholder="e.g. 3.3"
          className="w-24 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
        />
        <button
          onClick={applyInput}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Set"}
        </button>
        {saved && <span className="text-xs text-green-600">Saved ✓</span>}
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-300">Level format: 1.1 · 1.2 · 1.3 · 2.1 · 2.2…</p>
    </div>
  );
}
