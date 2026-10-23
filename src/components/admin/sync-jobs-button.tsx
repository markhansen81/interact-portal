"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncJobsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/admin/jobs/sync", { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      setResult(`Synced: ${data.created} created, ${data.updated} updated`);
      router.refresh();
    } else {
      setResult(`Error: ${data.error}`);
    }

    setLoading(false);
    setTimeout(() => setResult(null), 3000);
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-sm text-neutral-500">{result}</span>}
      <button
        onClick={handleSync}
        disabled={loading}
        className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Syncing..." : "Sync from Monday"}
      </button>
    </div>
  );
}
