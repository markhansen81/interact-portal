"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string) { const [,m,day] = d.split("-"); return `${parseInt(day)} ${MONTHS[parseInt(m)-1]}`; }
function fmtDateRange(start: string, end: string | null): string {
  if (!end || end === start) return `${fmtDate(start)} ${start.split("-")[0]}`;
  const [sy,sm] = start.split("-"); const [ey,em] = end.split("-");
  if (sy===ey && sm===em) return `${parseInt(start.split("-")[2])}–${fmtDate(end)} ${sy}`;
  if (sy===ey) return `${fmtDate(start)} – ${fmtDate(end)} ${ey}`;
  return `${fmtDate(start)} ${sy} – ${fmtDate(end)} ${ey}`;
}

const WO_STATUS: Record<string, { label: string; cls: string }> = {
  signed:   { label: "Signed",   cls: "bg-green-100 text-green-700" },
  sent:     { label: "Sent",     cls: "bg-blue-100 text-blue-700" },
  draft:    { label: "Draft",    cls: "bg-neutral-100 text-neutral-500" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
};

interface Job {
  id: string;
  monday_item_id: string | null;
  title: string;
  school: string;
  school_address: string;
  school_state: string;
  location: string;
  start_date: string;
  end_date: string;
  days: number;
  program_type: string;
  grade: string;
  accommodation: string;
  special_conditions: string;
  co_taught: boolean;
  tas_needed: number;
  status: string;
  notes: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
  teacher_invited_at: string | null;
  info_pack_submitted_at: string | null;
  info_pack_data: Record<string, unknown> | null;
  schedule_confirmed_at: string | null;
}

interface WorkOrder {
  id: string;
  ta_id: string;
  status: string;
  total: number | null;
  sent_at: string | null;
  signed_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    pay_level: number;
  };
}

interface ActivityEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  performer: { first_name: string; last_name: string } | null;
  ta: { first_name: string; last_name: string; email: string } | null;
}

function CheckCircle({ done }: { done: boolean }) {
  return done ? (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
      <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ) : (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-neutral-200" />
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-900">{value}</dd>
    </div>
  );
}

export function JobDetail({
  job,
  workOrders,
  activityLog,
}: {
  job: Job;
  workOrders: WorkOrder[];
  activityLog: ActivityEntry[];
}) {
  const router = useRouter();
  const [creatingWO, setCreatingWO] = useState<string | null>(null);
  const [confirmingSchedule, startTransition] = useTransition();

  const signedWOs = workOrders.filter(w => w.status === "signed");
  const sentWOs   = workOrders.filter(w => w.status === "sent");
  const remaining = job.tas_needed - signedWOs.length;

  const checkWOsSent      = workOrders.filter(w => w.status !== "draft").length > 0;
  const checkInfoPack     = !!job.info_pack_submitted_at;
  const checkSchedule     = !!job.schedule_confirmed_at;
  const doneCount = [checkWOsSent, checkInfoPack, checkSchedule].filter(Boolean).length;
  const pct = Math.round((doneCount / 4) * 100);

  async function toggleSchedule() {
    await fetch(`/api/admin/jobs/${job.id}/confirm-schedule`, { method: "POST" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

      {/* ── LEFT (2 cols) ── */}
      <div className="lg:col-span-2 space-y-6">

        {/* Project details */}
        <div className="rounded-sm border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Project Details</h3>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <Field label="Program" value={job.program_type} />
            <Field label="Dates" value={job.start_date ? fmtDateRange(job.start_date, job.end_date) : "—"} />
            <Field label="Days" value={job.days?.toString()} />
            <Field label="Location" value={job.school_state || job.location} />
            <Field label="Address" value={job.school_address} />
            <Field label="Grade" value={job.grade} />
            <Field label="Accommodation" value={job.accommodation} />
            <Field label="Co-taught" value={job.co_taught ? "Yes" : "No"} />
            {job.special_conditions && (
              <div className="col-span-full">
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Special Conditions</dt>
                <dd className="mt-0.5 text-sm italic text-neutral-700">{job.special_conditions}</dd>
              </div>
            )}
            {job.notes && (
              <div className="col-span-full">
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Notes</dt>
                <dd className="mt-0.5 text-sm text-neutral-700">{job.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Teaching Artists */}
        <div className="rounded-sm border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">
              Teaching Artists <span className="font-normal text-neutral-400">({workOrders.filter(w=>w.status!=="draft").length}/{job.tas_needed})</span>
            </h3>
            {remaining > 0 && (
              <span className="text-xs text-neutral-500">{remaining} more needed</span>
            )}
          </div>

          {workOrders.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">No TAs assigned yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {workOrders.map((wo) => {
                const ta = wo.profiles;
                const s = WO_STATUS[wo.status] ?? { label: wo.status, cls: "bg-neutral-100 text-neutral-500" };
                return (
                  <div key={wo.id} className="flex items-center gap-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {ta.first_name} {ta.last_name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Level {ta.pay_level} · {ta.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {wo.total ? (
                        <p className="text-sm font-medium text-neutral-700">€{Number(wo.total).toFixed(2)}</p>
                      ) : null}
                      {wo.sent_at && (
                        <p className="text-[10px] text-neutral-400">Sent {new Date(wo.sent_at).toLocaleDateString("de-DE")}</p>
                      )}
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Pack */}
        <div className="rounded-sm border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">Teacher Info Pack</h3>
            {job.info_pack_submitted_at ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Submitted {new Date(job.info_pack_submitted_at).toLocaleDateString("de-DE")}
              </span>
            ) : (
              <span className="text-xs text-neutral-400">Not yet submitted</span>
            )}
          </div>

          {job.info_pack_data ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              {Object.entries(job.info_pack_data).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                    {k.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-0.5 text-sm text-neutral-900">{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="rounded border border-dashed border-neutral-200 py-8 text-center">
              <p className="text-sm text-neutral-400">Awaiting teacher submission.</p>
              <p className="mt-1 text-xs text-neutral-300">
                Teacher portal coming soon — will auto-populate when submitted.
              </p>
            </div>
          )}
        </div>

        {/* Activity Log */}
        {activityLog.length > 0 && (
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Activity</h3>
            <div className="space-y-3">
              {activityLog.map((entry) => {
                const performer = entry.performer;
                const ta = entry.ta;
                const actionLabels: Record<string, string> = {
                  work_order_sent: "WO sent",
                  work_order_signed: "WO signed",
                  work_order_declined: "WO declined",
                  work_order_cancelled: "WO cancelled",
                };
                const dotCls = entry.action.includes("signed") ? "bg-green-500"
                  : entry.action.includes("declined") || entry.action.includes("cancelled") ? "bg-red-400"
                  : "bg-blue-400";
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotCls}`} />
                    <div>
                      <p className="text-sm text-neutral-700">
                        {actionLabels[entry.action] || entry.action}
                        {ta && <span className="text-neutral-500"> — {ta.first_name} {ta.last_name || ta.email}</span>}
                      </p>
                      {entry.details && <p className="text-xs text-neutral-400">{entry.details}</p>}
                      <p className="text-[10px] text-neutral-400">
                        {new Date(entry.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                        {performer && ` · ${performer.first_name} ${performer.last_name}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT sidebar ── */}
      <div className="space-y-6">

        {/* Admin Checklist */}
        <div className="rounded-sm border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">Checklist</h3>
            <span className="text-xs text-neutral-400">{doneCount}/4</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-100 mb-4">
            <div className={`h-1.5 rounded-full ${pct===100?"bg-green-500":"bg-blue-400"}`} style={{width:`${pct}%`}} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle done={checkWOsSent} />
              <span className={`text-sm ${checkWOsSent?"line-through text-neutral-400":"text-neutral-700"}`}>Work orders sent</span>
              {checkWOsSent && <span className="ml-auto text-xs text-neutral-400">{workOrders.filter(w=>w.status!=="draft").length}/{job.tas_needed}</span>}
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle done={checkInfoPack} />
              <span className={`text-sm ${checkInfoPack?"line-through text-neutral-400":"text-neutral-700"}`}>Info pack received</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle done={checkSchedule} />
              <span className={`text-sm ${checkSchedule?"line-through text-neutral-400":"text-neutral-700"}`}>Schedule confirmed</span>
              <button
                onClick={toggleSchedule}
                disabled={confirmingSchedule}
                className={`ml-auto text-xs font-medium hover:underline ${checkSchedule?"text-neutral-400":"text-[#E91E8C]"}`}
              >
                {checkSchedule ? "Undo" : "Confirm"}
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-neutral-200" />
              <span className="text-sm text-neutral-400">Make schedule</span>
              <span className="ml-auto text-xs text-neutral-300">Coming soon</span>
            </div>
          </div>
        </div>

        {/* Teacher Contact */}
        <div className="rounded-sm border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">Teacher Contact</h3>
          {job.teacher_name || job.teacher_email ? (
            <div className="space-y-1">
              {job.teacher_name && <p className="text-sm font-medium text-neutral-800">{job.teacher_name}</p>}
              {job.teacher_email && (
                <a href={`mailto:${job.teacher_email}`} className="text-sm text-blue-600 hover:underline block">
                  {job.teacher_email}
                </a>
              )}
              <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className={`h-2 w-2 rounded-full ${checkInfoPack?"bg-green-400":"bg-neutral-200"}`} />
                  Info pack {checkInfoPack ? "received" : "pending"}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className={`h-2 w-2 rounded-full ${checkSchedule?"bg-green-400":"bg-neutral-200"}`} />
                  Schedule {checkSchedule ? "confirmed" : "not confirmed"}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 italic">No teacher contact in Monday.</p>
          )}
        </div>

        {/* Staffing */}
        <div className="rounded-sm border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Staffing</h3>
          <p className="text-3xl font-bold text-neutral-900">{signedWOs.length}<span className="text-lg font-normal text-neutral-400">/{job.tas_needed}</span></p>
          <p className="mt-1 text-xs text-neutral-500">{remaining > 0 ? `${remaining} more needed` : "Fully staffed"}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-neutral-100">
            <div
              className={`h-2 rounded-full ${remaining===0?"bg-green-500":"bg-blue-500"}`}
              style={{width:`${Math.min(100,(signedWOs.length/Math.max(job.tas_needed,1))*100)}%`}}
            />
          </div>
          {sentWOs.length > 0 && (
            <p className="mt-2 text-xs text-neutral-400">{sentWOs.length} sent, awaiting signature</p>
          )}
        </div>

        {/* Monday link */}
        {job.monday_item_id && (
          <div className="rounded-sm border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Monday.com</h3>
            <a
              href={`https://interactenglish-squad.monday.com/boards/7871804260/pulses/${job.monday_item_id}`}
              target="_blank"
              className="text-sm text-blue-600 hover:underline"
            >
              Open in Monday ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
