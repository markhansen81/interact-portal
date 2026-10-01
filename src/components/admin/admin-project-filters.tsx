"use client";

import { useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  program_type: string | null;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  ta_name: string;
  total_tasks: number;
  completed_tasks: number;
}

const statusStyles: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

const filters = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function AdminProjectFilters({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const counts = {
    all: projects.length,
    upcoming: projects.filter((p) => p.status === "upcoming").length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">TA Projects</h2>

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
            <span className="ml-1.5 text-xs text-zinc-400">{counts[f.key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No projects found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Project Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">TA</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Program</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">School</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Dates</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Tasks</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.ta_name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.program_type || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.school || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {p.start_date && p.end_date ? `${formatDate(p.start_date)} — ${formatDate(p.end_date)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[p.status] || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                    {p.completed_tasks}/{p.total_tasks}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      View
                    </Link>
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
