"use client";

import { useState } from "react";
import Link from "next/link";

interface WorkOrder {
  id: string;
  project_name: string;
  program_type: string;
  school: string;
  location: string;
  start_date: string;
  end_date: string;
  days: number;
  total: number;
  status: string;
  sign_by: string | null;
  pdf_url: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  sent: "bg-yellow-100 text-yellow-700",
  signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  draft: "draft",
  sent: "unsigned",
  signed: "signed",
  declined: "declined",
};

const filters = [
  { key: "all", label: "All" },
  { key: "sent", label: "Unsigned" },
  { key: "signed", label: "Signed" },
  { key: "declined", label: "Declined" },
];

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function DeadlineBadge({ signBy, status }: { signBy: string | null; status: string }) {
  if (!signBy || status !== "sent") return null;
  const days = daysUntil(signBy);
  if (days < 0) {
    return <span className="text-xs font-medium text-red-600">Overdue</span>;
  }
  if (days === 0) {
    return <span className="text-xs font-medium text-red-600">Due today</span>;
  }
  if (days <= 3) {
    return <span className="text-xs font-medium text-yellow-600">{days}d left</span>;
  }
  return <span className="text-xs text-zinc-500">{days}d left</span>;
}

export function WorkOrderTable({ workOrders }: { workOrders: WorkOrder[] }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? workOrders : workOrders.filter((wo) => wo.status === filter);

  const counts = {
    all: workOrders.length,
    sent: workOrders.filter((wo) => wo.status === "sent").length,
    signed: workOrders.filter((wo) => wo.status === "signed").length,
    declined: workOrders.filter((wo) => wo.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Work Orders</h2>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs text-zinc-400">
              {counts[f.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No work orders found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Project</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Program</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">School</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Dates</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Total</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Deadline</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((wo) => (
                <tr key={wo.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/portal/work-orders/${wo.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                      {wo.project_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{wo.program_type}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    <div>{wo.school}</div>
                    <div className="text-xs text-zinc-400">{wo.location}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    <div>{formatDate(wo.start_date)} — {formatDate(wo.end_date)}</div>
                    <div className="text-xs text-zinc-400">{wo.days} day{wo.days > 1 ? "s" : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                    {wo.total ? `€${Number(wo.total).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[wo.status] || ""}`}>
                      {statusLabels[wo.status] || wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeadlineBadge signBy={wo.sign_by} status={wo.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/portal/work-orders/${wo.id}`}
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        View
                      </Link>
                      {wo.status === "signed" && wo.pdf_url && (
                        <a
                          href={wo.pdf_url}
                          target="_blank"
                          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
