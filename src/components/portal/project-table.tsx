"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, Button, Table, TableHeader, TableRow, TableCell, TableHeaderCell } from "@/components/ui";

interface Project {
  id: string;
  name: string;
  program_type: string | null;
  school: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  status: string;
  created_at: string;
  total_tasks: number;
  completed_tasks: number;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  upcoming: "info",
  active: "warning",
  completed: "success",
};

const filters = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ProjectTable({ projects }: { projects: Project[] }) {
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
      <h2 className="text-3xl font-bold tracking-tight text-neutral-900">My Projects</h2>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f.key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs text-neutral-400">
              {counts[f.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
          <p className="text-neutral-500">No projects found.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/portal/projects/${p.id}`} className="font-semibold text-neutral-900 hover:underline">
                    {p.name}
                  </Link>
                  <Badge variant={statusVariant[p.status] || "default"}>
                    {p.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {p.school || "\u2014"} &middot; {p.program_type || "\u2014"}
                </p>
                {p.start_date && p.end_date && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {formatDate(p.start_date)} — {formatDate(p.end_date)}
                    {p.days ? ` (${p.days} day${p.days > 1 ? "s" : ""})` : ""}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-neutral-600">
                    {p.completed_tasks}/{p.total_tasks} tasks done
                  </span>
                  <Link href={`/portal/projects/${p.id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block border border-neutral-200 rounded-sm bg-white">
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Project Name</TableHeaderCell>
                  <TableHeaderCell>Program</TableHeaderCell>
                  <TableHeaderCell>School</TableHeaderCell>
                  <TableHeaderCell>Dates</TableHeaderCell>
                  <TableHeaderCell className="text-center">Status</TableHeaderCell>
                  <TableHeaderCell className="text-center">Tasks</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHeader>
              <tbody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="px-4">
                      <Link href={`/portal/projects/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-neutral-600">{p.program_type || "\u2014"}</TableCell>
                    <TableCell className="px-4 text-neutral-600">
                      <div>{p.school || "\u2014"}</div>
                      {p.location && <div className="text-xs text-neutral-400">{p.location}</div>}
                    </TableCell>
                    <TableCell className="px-4 text-neutral-600 whitespace-nowrap">
                      {p.start_date && p.end_date ? (
                        <>
                          <div>{formatDate(p.start_date)} — {formatDate(p.end_date)}</div>
                          {p.days && <div className="text-xs text-neutral-400">{p.days} day{p.days > 1 ? "s" : ""}</div>}
                        </>
                      ) : (
                        "\u2014"
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      <Badge variant={statusVariant[p.status] || "default"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      <span className="text-sm text-neutral-600">
                        {p.completed_tasks}/{p.total_tasks} done
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Link href={`/portal/projects/${p.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
