"use client";

import { useState } from "react";
import Link from "next/link";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string) { const [,m,day] = d.split("-"); return `${parseInt(day)} ${MONTHS[parseInt(m)-1]}`; }
function fmtDateRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  if (!end || end === start) return `${fmtDate(start)} ${start.split("-")[0]}`;
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  if (sy === ey && sm === em) return `${parseInt(start.split("-")[2])}–${fmtDate(end)} ${sy}`;
  if (sy === ey) return `${fmtDate(start)} – ${fmtDate(end)} ${ey}`;
  return `${fmtDate(start)} ${sy} – ${fmtDate(end)} ${ey}`;
}

const STATUS_STYLES: Record<string, string> = {
  signed:   "bg-neutral-900 text-white",
  sent:     "bg-neutral-100 text-neutral-600",
  draft:    "bg-neutral-100 text-neutral-400",
  declined: "text-red-500",
};

interface WorkOrder {
  id: string;
  project_name: string | null;
  school: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  total: number | null;
  status: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
}

export function WorkOrdersTable({ workOrders }: { workOrders: WorkOrder[] }) {
  const [schoolSearch, setSchoolSearch] = useState("");
  const [taSearch, setTaSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Build unique lists for datalists
  const schools = Array.from(new Set(
    workOrders.map(wo => wo.school || wo.project_name || "").filter(Boolean)
  )).sort();

  const tas = Array.from(new Set(
    workOrders.map(wo => {
      const p = wo.profiles;
      return p?.first_name && p?.last_name ? `${p.first_name} ${p.last_name}` : (p?.email || "");
    }).filter(Boolean)
  )).sort();

  const filtered = workOrders.filter(wo => {
    const sq = schoolSearch.toLowerCase();
    const tq = taSearch.toLowerCase();
    const p = wo.profiles;
    const taName = p?.first_name && p?.last_name ? `${p.first_name} ${p.last_name}` : (p?.email || "");
    const schoolMatch = !sq || (wo.school || "").toLowerCase().includes(sq) || (wo.project_name || "").toLowerCase().includes(sq);
    const taMatch = !tq || taName.toLowerCase().includes(tq);
    const statusMatch = !statusFilter || wo.status === statusFilter;
    return schoolMatch && taMatch && statusMatch;
  });

  const hasFilter = schoolSearch || taSearch || statusFilter;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            list="school-list"
            value={schoolSearch}
            onChange={(e) => setSchoolSearch(e.target.value)}
            placeholder="Filter by school…"
            className="w-64 rounded-sm border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#E91E8C] focus:outline-none"
          />
          <datalist id="school-list">
            {schools.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <input
            type="search"
            list="ta-list"
            value={taSearch}
            onChange={(e) => setTaSearch(e.target.value)}
            placeholder="Filter by TA…"
            className="w-52 rounded-sm border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#E91E8C] focus:outline-none"
          />
          <datalist id="ta-list">
            {tas.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sm border border-neutral-200 bg-white py-1.5 px-3 text-sm text-neutral-600 focus:border-[#E91E8C] focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="signed">Signed</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {hasFilter && (
          <button onClick={() => { setSchoolSearch(""); setTaSearch(""); setStatusFilter(""); }} className="text-xs text-neutral-400 hover:text-neutral-600">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-neutral-400">{filtered.length} work orders</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
          No work orders match your filters
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Project</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">TA</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">School</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Dates</th>
                <th className="pb-3 pr-6 text-right text-xs font-medium uppercase tracking-wider text-neutral-400">Total</th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => {
                const ta = wo.profiles;
                const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—";
                const s = STATUS_STYLES[wo.status] ?? "bg-neutral-100 text-neutral-500";
                return (
                  <tr key={wo.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 pr-6 font-medium text-neutral-900">
                      <Link href={`/admin/work-orders/${wo.id}`} className="hover:text-[#E91E8C] hover:underline">
                        {wo.project_name || "—"}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-6 text-neutral-600">{taName}</td>
                    <td className="py-3.5 pr-6 text-neutral-500">{wo.school || "—"}</td>
                    <td className="py-3.5 pr-6 text-neutral-500 whitespace-nowrap">
                      {fmtDateRange(wo.start_date, wo.end_date)}
                    </td>
                    <td className="py-3.5 pr-6 text-right tabular-nums text-neutral-600">
                      {wo.total != null
                        ? `€${Number(wo.total).toLocaleString("de-DE", { minimumFractionDigits: 0 })}`
                        : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s}`}>
                        {wo.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
