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
      <h2 className="text-2xl font-bold text-neutral-900">TA Projects</h2>

      <div className="flex gap-1 rounded-sm bg-neutral-100 p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-white text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs text-neutral-400">{counts[f.key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">No projects found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Project Name</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">TA</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Program</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">School</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-500">Dates</th>
                <th className="px-4 py-3 text-center font-medium text-neutral-500">Status</th>
                <th className="px-4 py-3 text-center font-medium text-neutral-500">Tasks</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{p.ta_name}</td>
                  <td className="px-4 py-3 text-neutral-600">{p.program_type || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{p.school || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                    {p.start_date && p.end_date ? `${formatDate(p.start_date)} — ${formatDate(p.end_date)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[p.status] || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-600">
                    {p.completed_tasks}/{p.total_tasks}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="rounded-sm border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
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
