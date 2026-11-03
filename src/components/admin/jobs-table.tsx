"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
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

function TeacherInviteModal({ job, onClose, onSent }: { job: Job; onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState(job.teacher_email || "");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSend() {
    if (!email) return;
    setSending(true);
    await fetch(`/api/admin/jobs/${job.id}/invite-teacher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_email: email }),
    });
    setSending(false);
    setDone(true);
    setTimeout(() => { onClose(); onSent(); }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-sm rounded-sm border border-neutral-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-900">Invite Teacher</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{job.title} · {job.program_type}</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Teacher Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.de"
              autoFocus
              className="mt-1 w-full rounded border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <p className="text-[10px] text-neutral-400">
            An invite email will be sent to the teacher. You will be CC'd at mark@interactenglish.de.
          </p>
          {done ? (
            <p className="text-xs font-medium text-green-600">Sent ✓</p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sending || !email}
                className="flex-1 rounded bg-[#E91E8C] py-2 text-xs font-medium text-white hover:bg-[#d01a7d] disabled:opacity-50"
              >
                {sending ? "Sending..." : `Send invite to ${email || "…"}`}
              </button>
              <button onClick={onClose} className="rounded border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectHub({ job, onAssign }: { job: Job; onAssign: () => void }) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Derived admin checklist
  // "Send work orders" = all needed WOs are sent (or signed)
  const allWOsSent = job.needed > 0 && (job.sent + job.signed >= job.needed);
  // "Staffed" = all needed WOs are signed
  const fullyStaffed = job.needed > 0 && job.signed >= job.needed;
  const teacherInvited = !!job.teacher_invited_at;
  const infoPackReceived = !!job.info_pack_submitted_at;
  const scheduleConfirmed = !!job.schedule_confirmed_at;

  // Overall completion: 3 active checklist items
  const checks = [allWOsSent, infoPackReceived, scheduleConfirmed];
  const doneCount = checks.filter(Boolean).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  async function handleConfirmSchedule() {
    await fetch(`/api/admin/jobs/${job.id}/confirm-schedule`, { method: "POST" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 py-1">
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
          {/* 1. WOs sent — complete only when ALL needed WOs are sent */}
          <div className="flex items-center gap-2">
            <CheckIcon done={allWOsSent} />
            <span className={`text-xs ${allWOsSent ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
              Send work orders
            </span>
            {!allWOsSent && job.needed > 0 && (
              <button onClick={onAssign} className="ml-auto text-[10px] font-medium text-[#E91E8C] hover:underline">
                Assign →
              </button>
            )}
            {allWOsSent && !fullyStaffed && (
              <span className="ml-auto text-[10px] text-amber-500">{job.signed}/{job.needed} signed</span>
            )}
            {fullyStaffed && (
              <span className="ml-auto text-[10px] text-green-600">All signed ✓</span>
            )}
            {!allWOsSent && (job.sent + job.signed) > 0 && (
              <span className="ml-auto text-[10px] text-neutral-400">{job.sent + job.signed}/{job.needed} sent</span>
            )}
          </div>

          {/* 2. Invite teacher */}
          <div className="flex items-center gap-2">
            <CheckIcon done={false} />
            <span className="text-xs text-neutral-400">Invite teacher</span>
            <span className="ml-auto text-[10px] text-neutral-300">Portal coming soon</span>
          </div>

          {/* 3. Info pack */}
          <div className="flex items-center gap-2">
            <CheckIcon done={infoPackReceived} />
            <span className={`text-xs ${infoPackReceived ? "text-neutral-500 line-through" : "text-neutral-700"}`}>
              Info pack received
            </span>
            {!infoPackReceived && teacherInvited && (
              <span className="ml-auto text-[10px] text-neutral-400">Awaiting teacher</span>
            )}
          </div>

          {/* 4. Schedule confirmed */}
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

          {/* 5. Make schedule — coming soon */}
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-200" />
            <span className="text-xs text-neutral-400">Make schedule</span>
            <span className="ml-auto text-[10px] text-neutral-300">Coming soon</span>
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
        {!job.teacher_name && !job.teacher_email ? (
          <p className="text-xs text-neutral-400 italic">No teacher contact in Monday.</p>
        ) : (
          <div className="space-y-1.5">
            {job.teacher_name && (
              <p className="text-xs font-medium text-neutral-700">{job.teacher_name}</p>
            )}
            {job.teacher_email && (
              <p className="text-xs text-neutral-500">{job.teacher_email}</p>
            )}
            <p className="text-[10px] text-neutral-300 mt-1">Portal invite coming soon</p>
          </div>
        )}
      </div>
    </div>

      {/* Open project link */}
      <div className="flex justify-end pt-1">
        <Link
          href={`/admin/jobs/${job.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 hover:underline"
        >
          Open project →
        </Link>
      </div>
    </div>
  );
}

type Rec = {
  ta: { id: string; first_name: string; last_name: string; email: string; pay_level: number; onboarding_status: string };
  score: number;
  reasons: string[];
  isAvailable: boolean;
};

function AssignWOsModal({ job, onClose, onAssigned }: { job: Job; onClose: () => void; onAssigned: () => void }) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/admin/jobs/${job.id}/recommend`)
      .then((r) => r.json())
      .then((d) => { setRecs(d.recommendations || []); setLoading(false); });
  }, [job.id]);

  async function sendWO(taId: string) {
    setSending(taId);
    const res = await fetch("/api/admin/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ta_id: taId,
        job_id: job.id,
        project_name: job.title,
        school_state: job.school_state,
        start_date: job.start_date,
        end_date: job.end_date,
        days: job.days,
        program_type: job.program_type,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetch(`/api/admin/work-orders/${data.workOrder.id}/send`, { method: "POST" });
      setSent((prev) => new Set([...prev, taId]));
      onAssigned();
    }
    setSending(null);
  }

  const remaining = job.needed - job.signed - sent.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg rounded-sm border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{job.title}</h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {job.program_type} · {job.start_date ? fmtDateRange(job.start_date, job.end_date) : "No dates"} · {job.school_state || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${remaining <= 0 ? "text-green-600" : "text-neutral-500"}`}>
              {remaining <= 0 ? "Fully staffed" : `${remaining} more needed`}
            </span>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Already assigned */}
        {job.work_orders.length > 0 && (
          <div className="border-b border-neutral-100 px-5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Assigned</p>
            <div className="flex flex-wrap gap-1.5">
              {job.work_orders.map((wo) => (
                <span key={wo.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${WO_STATUS_COLORS[wo.status] ?? "bg-neutral-100 text-neutral-500"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  {wo.profiles?.full_name ?? "Unknown"} · {wo.status}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="px-5 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Recommendations</p>
          {loading ? (
            <p className="py-6 text-center text-xs text-neutral-400">Loading...</p>
          ) : recs.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-400">No available TAs found for these dates.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
              {recs.slice(0, 20).map((rec) => {
                const alreadySent = sent.has(rec.ta.id);
                const isSending = sending === rec.ta.id;
                return (
                  <div key={rec.ta.id} className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-neutral-50">
                    {/* Score */}
                    <span className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      rec.score >= 60 ? "bg-green-100 text-green-700" : rec.score >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-neutral-100 text-neutral-500"
                    }`}>
                      {rec.score}
                    </span>
                    {/* Availability dot */}
                    <span className={`shrink-0 h-2 w-2 rounded-full ${rec.isAvailable ? "bg-green-400" : "bg-neutral-300"}`} title={rec.isAvailable ? "Available" : "Availability not set"} />
                    {/* Name + level */}
                    <span className="flex-1 text-xs font-medium text-neutral-800">
                      {rec.ta.first_name} {rec.ta.last_name || rec.ta.email}
                    </span>
                    <span className="shrink-0 text-[10px] text-neutral-400">Lv{rec.ta.pay_level}</span>
                    {/* Send button */}
                    {alreadySent ? (
                      <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Sent ✓</span>
                    ) : (
                      <button
                        onClick={() => sendWO(rec.ta.id)}
                        disabled={!!sending || remaining <= 0}
                        className="shrink-0 rounded bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
                      >
                        {isSending ? "…" : "Send WO"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function JobsTable({ jobs }: { jobs: Job[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [assigningJob, setAssigningJob] = useState<Job | null>(null);

  const router = useRouter();

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

            // Overall progress for summary column
            const checks = [
              job.needed > 0 && (job.sent + job.signed >= job.needed),
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
                  {/* Project name — chevron + name toggle accordion; external link icon opens project */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium text-neutral-900">
                        {job.title}
                      </span>
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Open project"
                        className="shrink-0 text-neutral-300 hover:text-neutral-600 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
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
                      <button
                        onClick={() => setAssigningJob(job)}
                        className="inline-flex items-center gap-1 rounded-sm bg-[#E91E8C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#d01a7d]"
                      >
                        Assign WOs
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
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
                      <ProjectHub job={job} onAssign={() => setAssigningJob(job)} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      {assigningJob && (
        <AssignWOsModal
          job={assigningJob}
          onClose={() => setAssigningJob(null)}
          onAssigned={() => router.refresh()}
        />
      )}
    </div>
  );
}
