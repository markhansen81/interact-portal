"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TALevelEditor({ taId, currentLevel }: { taId: string; currentLevel: number }) {
  const [level, setLevel] = useState(currentLevel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save(newLevel: number) {
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

  return (
    <div>
      {level === 0
        ? <p className="text-3xl font-bold text-neutral-300 tabular-nums">TBC</p>
        : <p className="text-5xl font-bold text-neutral-900 tabular-nums">{level}</p>}
      <p className="text-xs text-neutral-400 mt-0.5 mb-4">{level === 0 ? "Not yet set" : "Current level"}</p>
      <div className="flex gap-1.5 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((l) => (
          <button
            key={l}
            onClick={() => save(l)}
            disabled={saving}
            className={`h-8 w-8 rounded-md text-sm font-semibold transition-colors ${
              l === level
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
            }`}
          >
            {l}
          </button>
        ))}
        {saved && <span className="self-center text-xs text-green-600 ml-1">Saved</span>}
        {saving && <span className="self-center text-xs text-neutral-400 ml-1">Saving…</span>}
      </div>
    </div>
  );
}
