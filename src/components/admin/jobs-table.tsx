"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

function fmtDateRange(start: string, end: string | null): string {
  if (!end || end === start) return `${fmtDate(start)} ${start.split("-")[0]}`;
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  if (sy === ey && sm === em) return `${parseInt(start.split("-")[2])}–${fmtDate(end)} ${sy}`;
  if (sy === ey) return `${fmtDate(start)} – ${fmtDate(end)} ${ey}`;
  return `${fmtDate(start)} ${sy} – ${fmtDate(end)} ${ey}`;
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
  teacher_email: string | null;
  teacher_name: string | null;
  teacher_invited_at: string | null;
  info_pack_submitted_at: string | null;
  schedule_confirmed_at: string | null;
};

const WO_STATUS_COLORS: Record<string, string> = {
  signed: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-neutral-100 text-neutral-500",
  declined: "bg-red-100 text-red-700",
};

function CheckIcon({ done }: { done: boolean }) {
  return done ? (
    <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="h-4 w-4 text-neutral-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  );
}

function ProjectHub({ job }: { job: Job }) {
  const router = useRouter();
  const [teacherEmail, setTeacherEmail] = useState(job.teacher_email || "");
  const [teacherName, setTeacherName] = useState(job.teacher_name || "");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [inviting, setInviting] = useState(false);

  // Derived admin checklist
  const wosSent = job.sent + job.signed > 0;
  const teacherInvited = !!job.teacher_invited_at;
  const infoPackReceived = !!job.info_pack_submitted_at;
  const scheduleConfirmed = !!job.schedule_confirmed_at;

  // Overall completion: 4 checklist items
  const checks = [wosSent, teacherInvited, infoPackReceived, scheduleConfirmed];
  const doneCount = checks.filter(Boolean).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  async function handleInviteTeacher() {
    if (!teacherEmail) return;
    setInviting(true);
    await fetch(`/api/admin/jobs/${job.id}/invite-teacher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_email: teacherEmail, teacher_name: teacherName }),
    });
    setInviting(false);
    setShowInviteForm(false);
    startTransition(() => router.refresh());
  }

  async function handleConfirmSchedule() {
    await fetch(`/api/admin/jobs/${job.id}/confirm-schedule`, { method: "POST" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 py-1 pr-4">
      {/* Admin Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Admin Checklist</p>
          <span className="text-[10px] font-medium text-neutral-400">{doneCount}/{checks.length} done</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-neutral-100 mb-2">
          <div
            className={`h-1 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-1.5">
          {/* 1. WOs sent */}
          <div className="flex items-center gap-2">
            <CheckIcon done={wosSent} />
            <span className={`text-xs ${wosSent ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
              Send work orders
            </span>
            {!wosSent && job.needed > 0 && (
              <Link href={`/admin/jobs/${job.id}`} className="ml-auto text-[10px] font-medium text-[#E91E8C] hover:underline">
                Assign →
              </Link>
            )}
            {wosSent && (
              <span className="ml-auto text-[10px] text-neutral-400">{job.sent + job.signed}/{job.needed} sent</span>
            )}
          </div>

          {/* 2. Invite teacher */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CheckIcon done={teacherInvited} />
              <span className={`text-xs ${teacherInvited ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
                Invite teacher
              </span>
              {teacherInvited && job.teacher_email && (
                <span className="ml-auto text-[10px] text-neutral-400 truncate max-w-[120px]">{job.teacher_email}</span>
              )}
              {!teacherInvited && !showInviteForm && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="ml-auto text-[10px] font-medium text-[#E91E8C] hover:underline"
                >
                  Invite →
                </button>
              )}
            </div>
            {showInviteForm && (
              <div className="ml-6 flex flex-col gap-1.5 mt-1">
                <input
                  type="email"
                  placeholder="teacher@school.de"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  className="rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:border-neutral-400"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleInviteTeacher}
                    disabled={inviting || !teacherEmail}
                    className="rounded bg-[#E91E8C] px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[#d01a7d] disabled:opacity-50"
                  >
                    {inviting ? "Sending..." : "Send invite"}
                  </button>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="rounded border border-neutral-200 px-2.5 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Info pack */}
          <div className="flex items-center gap-2">
            <CheckIcon done={infoPackReceived} />
            <span className={`text-xs ${infoPackReceived ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
              Info pack received
            </span>
            {!infoPackReceived && teacherInvited && (
              <span className="ml-auto text-[10px] text-neutral-400">Awaiting teacher</span>
            )}
          </div>

          {/* 5. Schedule confirmed */}
          <div className="flex items-center gap-2">
            <CheckIcon done={scheduleConfirmed} />
            <span className={`text-xs ${scheduleConfirmed ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
              Schedule confirmed
            </span>
            <button
              onClick={handleConfirmSchedule}
              disabled={isPending}
              className={`ml-auto text-[10px] font-medium hover:underline ${scheduleConfirmed ? "text-neutral-400" : "text-[#E91E8C]"}`}
            >
              {scheduleConfirmed ? "Undo" : "Confirm →"}
            </button>
          </div>
        </div>
      </div>

      {/* TAs Section */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">
          Teaching Artists ({job.total}/{job.needed})
        </p>
        {job.work_orders.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">No TAs assigned yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {job.work_orders.map((wo) => (
              <div key={wo.id} className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${WO_STATUS_COLORS[wo.status] ?? "bg-neutral-100 text-neutral-500"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  {wo.status}
                </span>
                <span className="text-xs text-neutral-700">{wo.profiles?.full_name ?? "Unknown TA"}</span>
              </div>
            ))}
            {job.remaining > 0 && (
              <p className="text-[10px] text-neutral-400 mt-1">{job.remaining} more needed</p>
            )}
          </div>
        )}
      </div>

      {/* Teacher Section */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Teacher</p>
        {!teacherInvited ? (
          <p className="text-xs text-neutral-400 italic">Not yet invited.</p>
        ) : (
          <div className="space-y-1.5">
            {job.teacher_name && (
              <p className="text-xs font-medium text-neutral-700">{job.teacher_name}</p>
            )}
            <p className="text-xs text-neutral-500">{job.teacher_email}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckIcon done={infoPackReceived} />
                <span className="text-[10px] text-neutral-500">Info pack</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckIcon done={scheduleConfirmed} />
                <span className="text-[10px] text-neutral-500">Schedule confirmed</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
            <th className="w-16 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500 whitespace-nowrap"># TAs</th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Staffing</th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Progress</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {jobs.map((job) => {
            const isExpanded = expanded.has(job.id);
            const weekBg = job.weekColor === 1 ? "bg-neutral-50" : "bg-white";
            const hoverBg = "hover:bg-neutral-100";

            // Overall progress for summary column (4 items)
            const checks = [
              job.sent + job.signed > 0,
              !!job.teacher_invited_at,
              !!job.info_pack_submitted_at,
              !!job.schedule_confirmed_at,
            ];
            const doneCount = checks.filter(Boolean).length;
            const pct = Math.round((doneCount / checks.length) * 100);

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
                  {/* # TAs needed */}
                  <td className="px-4 py-3 text-center">
                    {job.needed > 0 ? (
                      <span className="text-sm font-semibold text-neutral-700">{job.needed}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
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
                  {/* Overall progress */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-14 rounded-full bg-neutral-100">
                        <div
                          className={`h-1.5 rounded-full ${pct === 100 ? "bg-green-500" : "bg-purple-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-400">{pct}%</span>
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
                {/* Expanded project hub */}
                {isExpanded && (
                  <tr key={`${job.id}-expanded`} className={weekBg}>
                    <td />
                    <td colSpan={9} className="px-4 pb-4 pt-2">
                      <ProjectHub job={job} />
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
