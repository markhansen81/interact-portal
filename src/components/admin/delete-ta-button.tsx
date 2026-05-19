"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTAButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/teaching-artists/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error — try again");
      setLoading(false);
      return;
    }
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">{error || `Delete ${name}?`}</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          {loading ? "..." : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
    >
      Delete
    </button>
  );
}
