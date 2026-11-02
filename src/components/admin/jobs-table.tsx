"use client";

import Link from "next/link";
import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(dateStr: string): string {
 const [, m, d] = dateStr.split("-");
 return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

function fmtDateRange(start: string, end: string | null): string {
 if (!end) return fmtDate(start);
 const [sy, sm] = start.split("-");
 const [ey, em] = end.split("-");
 const startStr = fmtDate(start);
 const endStr = fmtDate(end);
 // Same month: "2–6 Nov 2026"
 if (sy === ey && sm === em) {
 const [, , sd] = start.split("-");
 return `${parseInt(sd)}–${endStr} ${sy}`;
 }
 // Different month, same year: "2 Nov – 6 Dec 2026"
 if (sy === ey) return `${startStr} – ${endStr} ${ey}`;
 // Different year
 return `${startStr} ${sy} – ${endStr} ${ey}`;
}

type WO = {
 id: string;
 ta_id: string;
 status: string;
 profiles: { full_name: string | null } | null;
};

type Job = {
 id: string;
 title: string;
 program_type: string | null;
 school_state: string | null;
 start_date: string | null;
 end_date: string | null;
 days: number | null;
 tas_needed: number | null;
 work_orders: WO[];
 weekNum: number | null;
 weekColor: number;
 needsAttention: boolean;
 isFullyStaffed: boolean;
 signed: number;
 sent: number;
 remaining: number;
 needed: number;
 total: number;
};

const STATUS_COLORS: Record<string, string> = {
 signed: "bg-green-100 text-green-700",
 sent: "bg-blue-100 text-blue-700",
 draft: "bg-neutral-100 text-neutral-500",
};

export function JobsTable({ jobs }: { jobs: Job[] }) {
 const [expanded, setExpanded] = useState<Set<string>>(new Set());

 function toggle(id: string) {
 setExpanded((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 }

 return (
 <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
 <table className="w-full">
 <thead>
 <tr className="border-b border-neutral-200">
 <th className="w-12 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">KW</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Project</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Type</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Location</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Dates</th>
 <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Days</th>
 <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Staffing</th>
 <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">WOs</th>
 <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200">
 {jobs.map((job) => {
 const isExpanded = expanded.has(job.id);
 const weekBg = job.weekColor === 1 ? "bg-slate-50" : "bg-white";
 const hoverBg = "hover:bg-neutral-100";

 return (
 <>
 <tr
 key={job.id}
 onClick={() => toggle(job.id)}
 className={`group cursor-pointer ${weekBg} ${hoverBg}`}
 >
 {/* KW */}
 <td className="px-3 py-3 text-center">
 <span className="text-xs font-bold text-neutral-400">
 {job.weekNum ?? "—"}
 </span>
 </td>
 {/* Project name */}
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <svg
 className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
 fill="none" stroke="currentColor" viewBox="0 0 24 24"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
 </svg>
 <span className="text-sm font-medium text-neutral-900">{job.title}</span>
 </div>
 </td>
 {/* Type */}
 <td className="px-4 py-3 text-sm text-neutral-500">{job.program_type || "—"}</td>
 {/* Location */}
 <td className="px-4 py-3 text-sm text-neutral-500">{job.school_state || "—"}</td>
 {/* Dates */}
 <td className="px-4 py-3 text-sm text-neutral-500 whitespace-nowrap">
 {job.start_date ? fmtDateRange(job.start_date, job.end_date) : "—"}
 </td>
 {/* Days */}
 <td className="px-4 py-3 text-center text-sm text-neutral-500">{job.days || "—"}</td>
 {/* Staffing bar */}
 <td className="px-4 py-3">
 <div className="flex items-center justify-center">
 {job.needed > 0 ? (
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-16 rounded-full bg-neutral-100">
 <div
 className={`h-1.5 rounded-full ${job.isFullyStaffed ? "bg-green-500" : "bg-blue-500"}`}
 style={{ width: `${Math.min(100, (job.signed / job.needed) * 100)}%` }}
 />
 </div>
 <span className={`text-xs font-medium ${job.isFullyStaffed ? "text-green-600" : job.remaining > 0 ? "text-neutral-900" : "text-neutral-500"}`}>
 {job.signed}/{job.needed}
 </span>
 </div>
 ) : (
 <span className="text-xs text-neutral-400">—</span>
 )}
 </div>
 </td>
 {/* WO badges */}
 <td className="px-4 py-3">
 <div className="flex items-center justify-center">
 {job.total > 0 ? (
 <div className="flex items-center gap-1">
 {job.signed > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-100 px-1.5 text-[10px] font-bold text-green-700" title="Signed">{job.signed}</span>}
 {job.sent > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700" title="Sent">{job.sent}</span>}
 {job.work_orders.filter((w) => w.status === "draft").length > 0 && (
 <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[10px] font-bold text-neutral-500" title="Draft">
 {job.work_orders.filter((w) => w.status === "draft").length}
 </span>
 )}
 </div>
 ) : job.remaining > 0 ? (
 <span className="text-xs text-yellow-600 font-medium">{job.remaining} to send</span>
 ) : (
 <span className="text-xs text-neutral-400">—</span>
 )}
 </div>
 </td>
 {/* Action */}
 <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
 {job.needsAttention ? (
 <Link
 href={`/admin/jobs/${job.id}`}
 className="inline-flex items-center gap-1 rounded-sm bg-[#E91E8C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#d01a7d]"
 >
 Assign WOs
 <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
 </Link>
 ) : (
 <Link
 href={`/admin/jobs/${job.id}`}
 className="inline-flex items-center gap-1 rounded-sm border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-50"
 onClick={(e) => e.stopPropagation()}
 >
 Open
 </Link>
 )}
 </td>
 </tr>
 {/* Expanded TA rows */}
 {isExpanded && (
 <tr key={`${job.id}-expanded`} className={weekBg}>
 <td />
 <td colSpan={8} className="px-4 pb-3 pt-1">
 {job.work_orders.length === 0 ? (
 <p className="text-xs text-neutral-400 italic">No TAs assigned yet.</p>
 ) : (
 <div className="flex flex-wrap gap-2">
 {job.work_orders.map((wo) => (
 <span
 key={wo.id}
 className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[wo.status] ?? "bg-neutral-100 text-neutral-500"}`}
 >
 <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
 {wo.profiles?.full_name ?? "Unknown TA"}
 <span className="opacity-60">· {wo.status}</span>
 </span>
 ))}
 </div>
 )}
 </td>
 </tr>
 )}
 </>
 );
 })}
 </tbody>
 </table>
 </div>
 );
}
