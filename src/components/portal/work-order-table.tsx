"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, Button, Table, TableHeader, TableRow, TableCell, TableHeaderCell } from "@/components/ui";

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

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  draft: "default",
  sent: "warning",
  signed: "success",
  declined: "error",
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
  return <span className="text-xs text-neutral-500">{days}d left</span>;
}

export function WorkOrderTable({ workOrders, projectMap = {} }: { workOrders: WorkOrder[]; projectMap?: Record<string, string> }) {
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
      <h2 className="text-3xl font-bold tracking-tight text-neutral-900">My Work Orders</h2>

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
          <p className="text-neutral-500">No work orders found.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((wo) => (
              <Card key={wo.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/portal/work-orders/${wo.id}`} className="font-semibold text-neutral-900 hover:underline">
                    {wo.project_name}
                  </Link>
                  <Badge variant={statusVariant[wo.status] || "default"}>
                    {statusLabels[wo.status] || wo.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {wo.school} &middot; {wo.program_type}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatDate(wo.start_date)} — {formatDate(wo.end_date)} ({wo.days} day{wo.days > 1 ? "s" : ""})
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-neutral-900">
                    {wo.total ? `\u20AC${Number(wo.total).toFixed(2)}` : "\u2014"}
                  </span>
                  <div className="flex items-center gap-2">
                    <DeadlineBadge signBy={wo.sign_by} status={wo.status} />
                    <Link href={`/portal/work-orders/${wo.id}`}>
                      <Button variant={wo.status === "sent" ? "primary" : "secondary"} size="sm">
                        {wo.status === "sent" ? "Sign" : "View"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block border border-neutral-200 rounded-sm bg-white">
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Project</TableHeaderCell>
                  <TableHeaderCell>Program</TableHeaderCell>
                  <TableHeaderCell>School</TableHeaderCell>
                  <TableHeaderCell>Dates</TableHeaderCell>
                  <TableHeaderCell className="text-right">Total</TableHeaderCell>
                  <TableHeaderCell className="text-center">Status</TableHeaderCell>
                  <TableHeaderCell className="text-center">Deadline</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </tr>
              </TableHeader>
              <tbody>
                {filtered.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="px-4">
                      <Link href={`/portal/work-orders/${wo.id}`} className="font-medium text-neutral-900 hover:underline">
                        {wo.project_name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 text-neutral-600">{wo.program_type}</TableCell>
                    <TableCell className="px-4 text-neutral-600">
                      <div>{wo.school}</div>
                      <div className="text-xs text-neutral-400">{wo.location}</div>
                    </TableCell>
                    <TableCell className="px-4 text-neutral-600 whitespace-nowrap">
                      <div>{formatDate(wo.start_date)} — {formatDate(wo.end_date)}</div>
                      <div className="text-xs text-neutral-400">{wo.days} day{wo.days > 1 ? "s" : ""}</div>
                    </TableCell>
                    <TableCell className="px-4 text-right font-semibold text-neutral-900">
                      {wo.total ? `\u20AC${Number(wo.total).toFixed(2)}` : "\u2014"}
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      <Badge variant={statusVariant[wo.status] || "default"}>
                        {statusLabels[wo.status] || wo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      <DeadlineBadge signBy={wo.sign_by} status={wo.status} />
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/portal/work-orders/${wo.id}`}>
                          <Button variant="secondary" size="sm">View</Button>
                        </Link>
                        {wo.status === "signed" && wo.pdf_url && (
                          <a href={wo.pdf_url} target="_blank">
                            <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700">PDF</Button>
                          </a>
                        )}
                        {wo.status === "signed" && projectMap[wo.id] && (
                          <Link href={`/portal/projects/${projectMap[wo.id]}`}>
                            <Button variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-700">Project</Button>
                          </Link>
                        )}
                      </div>
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
