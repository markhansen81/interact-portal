"use client";

import { useState, useMemo } from "react";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  lanes_planes_synced: boolean | null;
  lanes_planes_synced_at: string | null;
}

type FilterTab = "all" | "synced" | "not_synced";

export function LanesPlanePanel({ tas: initialTAs }: { tas: TA[] }) {
  const [tas, setTAs] = useState(initialTAs);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalTAs = tas.length;
  const syncedCount = tas.filter((t) => t.lanes_planes_synced).length;
  const notSyncedActive = tas.filter(
    (t) => !t.lanes_planes_synced && t.is_active
  ).length;

  const lastSync = useMemo(() => {
    const dates = tas
      .map((t) => t.lanes_planes_synced_at)
      .filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.sort().reverse()[0];
  }, [tas]);

  const filteredTAs = useMemo(() => {
    switch (filter) {
      case "synced":
        return tas.filter((t) => t.lanes_planes_synced);
      case "not_synced":
        return tas.filter((t) => !t.lanes_planes_synced);
      default:
        return tas;
    }
  }, [tas, filter]);

  const toggleExclude = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/lanes-planes/sync", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || `Sync failed (${res.status})`,
        });
        return;
      }

      setMessage({
        type: "success",
        text: `Synced ${data.synced} TAs to Lanes & Planes${data.skipped > 0 ? ` (${data.skipped} skipped — incomplete profiles)` : ""}`,
      });

      // Update local state to reflect sync
      if (data.syncedAt) {
        setTAs((prev) =>
          prev.map((ta) =>
            ta.is_active && ta.email && ta.first_name && ta.last_name
              ? {
                  ...ta,
                  lanes_planes_synced: true,
                  lanes_planes_synced_at: data.syncedAt,
                }
              : ta
          )
        );
      }
    } catch {
      setMessage({ type: "error", text: "Network error — sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "synced", label: "Synced" },
    { key: "not_synced", label: "Not Synced" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total TAs" value={totalTAs} />
        <SummaryCard
          label="Synced to L&P"
          value={syncedCount}
          accent="emerald"
        />
        <SummaryCard
          label="Not Synced (Active)"
          value={notSyncedActive}
          accent={notSyncedActive > 0 ? "amber" : undefined}
        />
        <SummaryCard label="Last Sync" value={formatDate(lastSync)} small />
      </div>

      {/* Sync button + message */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-600 dark:hover:bg-slate-700"
        >
          {syncing && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {syncing ? "Syncing..." : "Sync All Active TAs"}
        </button>

        {message && (
          <p
            className={`text-sm font-medium ${
              message.type === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TA table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-slate-50 dark:bg-zinc-900">
            <tr>
              <th className="w-10 px-4 py-3">
                <span className="sr-only">Include</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                L&P Synced
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Last Synced
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {filteredTAs.map((ta) => (
              <tr
                key={ta.id}
                className={
                  excluded.has(ta.id)
                    ? "opacity-40"
                    : "hover:bg-slate-50/50 dark:hover:bg-zinc-900/50"
                }
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!excluded.has(ta.id)}
                    onChange={() => toggleExclude(ta.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-slate-600 focus:ring-slate-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {ta.first_name} {ta.last_name}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {ta.email || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ta.is_active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {ta.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ta.lanes_planes_synced
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {ta.lanes_planes_synced ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDate(ta.lanes_planes_synced_at)}
                </td>
              </tr>
            ))}
            {filteredTAs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-zinc-400"
                >
                  No TAs match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string | number;
  accent?: "emerald" | "amber";
  small?: boolean;
}) {
  const valueColor =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-900 dark:text-zinc-50";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold ${valueColor} ${small ? "text-sm" : "text-2xl"}`}
      >
        {value}
      </p>
    </div>
  );
}
