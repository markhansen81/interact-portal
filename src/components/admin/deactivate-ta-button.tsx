"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeactivateTAButton({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    await fetch(`/api/admin/teaching-artists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-600">{isActive ? `Deactivate ${name}?` : `Activate ${name}?`}</span>
        <button onClick={handleToggle} disabled={loading}
          className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100">
          {loading ? "..." : "Yes"}
        </button>
        <button onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">
          No
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className={`rounded px-2 py-1 text-xs ${isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}>
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
