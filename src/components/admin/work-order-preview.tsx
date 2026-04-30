"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface WorkOrder {
  id: string;
  project_id_internal: string;
  ta_id: string;
  project_name: string;
  school: string;
  school_address: string;
  school_state: string;
  location: string;
  start_date: string;
  end_date: string;
  days: number;
  program_type: string;
  daily_rate: number;
  total: number;
  special_conditions: string;
  co_taught: boolean;
  grade: string;
  accommodation: string;
  status: string;
  sign_by: string | null;
  notes: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function WorkOrderPreview({ workOrder: initialWO }: { workOrder: WorkOrder }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [wo, setWO] = useState(initialWO);

  const ta = wo.profiles;
  const taName = ta.first_name && ta.last_name
    ? `${ta.first_name} ${ta.last_name}`
    : ta.email;

  async function handleSend() {
    setLoading(true);
    await fetch(`/api/admin/work-orders/${wo.id}/send`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/admin/work-orders/${wo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: wo.project_name,
        school: wo.school,
        school_address: wo.school_address,
        school_state: wo.school_state,
        location: wo.location,
        start_date: wo.start_date,
        end_date: wo.end_date,
        days: wo.days,
        program_type: wo.program_type,
        daily_rate: wo.daily_rate,
        total: wo.total,
        special_conditions: wo.special_conditions,
        co_taught: wo.co_taught,
        grade: wo.grade,
        accommodation: wo.accommodation,
        sign_by: wo.sign_by,
        notes: wo.notes,
      }),
    });
    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  function update(field: string, value: string | number | boolean | null) {
    setWO({ ...wo, [field]: value });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/work-orders" className="text-sm text-zinc-500 hover:text-zinc-700">&larr; Back</Link>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Work Order</h2>
          <StatusBadge status={wo.status} />
        </div>
        <div className="flex items-center gap-3">
          {wo.sign_by && (
            <span className={`text-sm ${new Date(wo.sign_by) < new Date() ? "text-red-600" : "text-zinc-500"}`}>
              Sign by: {wo.sign_by}
            </span>
          )}
          {wo.status !== "cancelled" && wo.status !== "declined" && !editing && (
            <>
              {wo.status === "draft" && (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Edit
                </button>
              )}
              {wo.status === "draft" && (
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {loading ? "Sending..." : "Send to TA"}
                </button>
              )}
              {!cancelling ? (
                <button
                  onClick={() => setCancelling(true)}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm w-48"
                  />
                  <button
                    onClick={async () => {
                      setLoading(true);
                      await fetch(`/api/admin/work-orders/${wo.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "cancelled", previous_status: wo.status, reason: cancelReason }),
                      });
                      setLoading(false);
                      router.push("/admin/work-orders");
                      router.refresh();
                    }}
                    disabled={loading}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? "..." : "Confirm"}
                  </button>
                  <button onClick={() => setCancelling(false)} className="text-sm text-zinc-500">
                    Back
                  </button>
                </div>
              )}
            </>
          )}
          {editing && (
            <>
              <button
                onClick={() => { setWO(initialWO); setEditing(false); }}
                className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rendered Work Order Document */}
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">WORK ORDER</h1>
              <p className="mt-1 text-sm text-zinc-500">InterACT English gGmbH</p>
            </div>
            <div className="text-right text-xs text-zinc-400">
              <p>InterACT English gGmbH</p>
              <p>Planufer 92B, 10967 Berlin</p>
              <p>Tel. 030 20339702</p>
              <p>info@interactenglish.de</p>
              <p className="mt-2 font-medium text-green-600">Project ID: {wo.project_id_internal}</p>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">By and between</p>
          <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">InterACT English gGmbH</p>
          <p className="text-sm text-zinc-500">(referred to in the following as &quot;the Company&quot;)</p>
          <p className="mt-4 text-sm text-zinc-500">and:</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{taName}</p>
          <p className="text-sm text-zinc-500">(referred to in the following as &quot;the Contractor&quot;)</p>
        </div>

        {/* Project Details — Editable */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Project Details</h3>
          <p className="mb-4 text-sm text-zinc-500">The Contractor shall be teaching on the following project (Project details are subject to change):</p>

          {editing ? (
            <div className="space-y-3">
              <EditRow label="Date of project" type="dates"
                value={`${wo.start_date}|${wo.end_date}|${wo.days}`}
                onChange={(v) => {
                  const [s, e, d] = v.split("|");
                  setWO({ ...wo, start_date: s, end_date: e, days: parseInt(d) || wo.days });
                }}
              />
              <EditField label="Organisation" value={wo.school} onChange={(v) => update("school", v)} />
              <EditField label="Address" value={wo.school_address} onChange={(v) => update("school_address", v)} />
              <EditField label="State" value={wo.school_state} onChange={(v) => update("school_state", v)} />
              <EditField label="Project type" value={wo.program_type} onChange={(v) => update("program_type", v)} />
              <EditField label="Special conditions" value={wo.special_conditions} onChange={(v) => update("special_conditions", v)} />
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-48">Co taught:</label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wo.co_taught} onChange={(e) => update("co_taught", e.target.checked)} className="rounded" />
                  {wo.co_taught ? "Co taught" : "Not co taught"}
                </label>
              </div>
              <EditField label="Grade" value={wo.grade} onChange={(v) => update("grade", v)} />
              <EditField label="Accommodation" value={wo.accommodation} onChange={(v) => update("accommodation", v)} />
              <EditField label="Sign by" value={wo.sign_by || ""} onChange={(v) => update("sign_by", v || null)} type="date" />
            </div>
          ) : (
            <dl className="space-y-2">
              <DetailRow label="Date of project / Time period" value={`${wo.start_date} — ${wo.end_date}, ${wo.days} day${wo.days > 1 ? "s" : ""}`} />
              <DetailRow label="Organisation (workplace)" value={wo.school || "—"} />
              {wo.school_address && <DetailRow label="" value={wo.school_address} />}
              {wo.school_state && <DetailRow label="" value={wo.school_state} />}
              <DetailRow label="Project type" value={wo.program_type} />
              <DetailRow label="Special conditions" value={wo.special_conditions || "None"} italic />
              <DetailRow label="Co taught / Not co taught" value={wo.co_taught ? "Co taught" : "Not co taught"} />
              <DetailRow label="Grade" value={wo.grade || "—"} />
              <DetailRow label="Accommodation" value={wo.accommodation || "—"} />
            </dl>
          )}
        </div>

        {/* Remuneration — Editable */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Remuneration</h3>
          {editing ? (
            <div className="mt-2 flex items-center gap-4">
              <span className="text-lg text-zinc-500">€</span>
              <input
                type="number"
                step="0.01"
                value={wo.total || ""}
                onChange={(e) => update("total", parseFloat(e.target.value) || 0)}
                className="input w-40 text-2xl font-bold"
                placeholder="0.00"
              />
              <span className="text-sm text-zinc-500">Based on pay level + {wo.days} days</span>
            </div>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {wo.total ? `€${Number(wo.total).toFixed(2)}` : "As per pay scale"}
              </p>
              {wo.daily_rate && (
                <p className="text-sm text-zinc-500">Based on TA pay level — {wo.days} day{wo.days > 1 ? "s" : ""}</p>
              )}
            </>
          )}
        </div>

        {/* IMPORTANT Notes — before conditions */}
        <div className="border-b border-zinc-200 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p className="font-bold text-zinc-900 dark:text-zinc-50">
            IMPORTANT: Before signing this work order please do and consider the following:
          </p>
          <ol className="mt-3 list-decimal space-y-3 pl-5">
            <li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. This has the obvious reason that we must ensure that teaching staff arrives on time to run the program. Same day travel may be organised by InterACT in some exceptions, but it remains in the companies judgment if this is warranted/possible or not. Travel the day before is included in the flat-fee paid for every program. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
            <li>Check the address of the school/hostel you will travel to. Some projects require longer travel time. Please consider this before signing the work order.</li>
            <li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food, or a supermarket can be difficult in rural locations. Please be prepared before you travel.</strong> This might mean packing some food, or bringing essentials.</li>
            <li>Please CAREFULLY read the project notes prepared for you in the project folder <u>the week before traveling</u>. These notes have critical information that impacts the project and your travel plans. If anything is unclear contact the project coordinator during working hours (M-F) and we can answer your questions.</li>
            <li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance of your project.</strong> We always endeavour to provide accurate information but mistakes do happen. You can prevent complications and frustration by double checking all details of this project before you travel. Details can be found in your project notes.</li>
          </ol>
        </div>

        {/* Decline note */}
        <div className="border-b border-zinc-200 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share to why you are declining the work order.</p>
          <p className="mt-3">We may have open positions available and would love to find the right project for you.</p>
          <p className="mt-3">Reasons include: needing a project closer to your hometown, that you can only work certain days, or that you are looking for a certain type of project for the week. In some cases we may be able to provide alternative projects in this period that meet your requirements.</p>
          <p className="mt-3">We thank you for all of your input and wish you a successful projects!</p>
        </div>

        {/* Work Order Conditions — full bilingual */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 mb-6">WORK ORDER CONDITIONS</h3>
          <div className="grid grid-cols-2 gap-8 text-sm text-zinc-600 dark:text-zinc-400">
            {/* German */}
            <div className="space-y-5">
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">AUFTRAG</h4>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 1 Tätigkeit</p>
                <p>Der Auftragnehmer wird für den Auftraggeber als Teaching Artist tätig.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 2 Bezahlung</p>
                <p>Der Auftragnehmer verpflichtet sich die Rechnung gemäß der Vergütungstabelle sowie seinem entsprechenden Vergütungslevel von Seite 3 und 4 stellen, sofern nicht anders in § 2 erwähnt. Es liegt in der Verantwortung des Auftragnehmers das persönliche Vergütungslevel zu erfassen. Die angegebene Vergütung versteht sich einschließlich der geltenden Umsatzsteuer.</p>
                <p className="mt-2">Der Auftraggeber verpflichtet sich die Rechnung innerhalb von 30 Tagen nach Rechnungsdatum zu begleichen.</p>
                <p className="mt-2">Krankentage werden nicht vergütet</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 3 Reisekosten</p>
                <p>Der Auftraggeber übernimmt die anfallenden Fahrtkosten und Übernachtungskosten für das oben genannte Projekt. Weitere Reisekosten, wie Verpflegungspauschalen o.Ä., werden nicht übernommen.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 4 Rücktritt</p>
                <p>Wie in der Lehrvereinbarung § 10 (2) beschlossen, verpflichtet sich der Auftragnehmer bei Nichtaufnahme des Projekts oder bei Vertragsrücktritt aufgrund von anderen Gründen als Krankheit oder (vom Arbeitgeber genehmigten) speziellen Umständen eine Vertragsstrafe von EURO 300,00 an den Auftraggeber zu bezahlen.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 6 Lehrvereinbarung</p>
                <p>Dieser Auftrag unterliegt der Lehrvereinbarung, welche zuvor von beiden Parteien unterzeichnet wurde.</p>
              </div>
            </div>
            {/* English */}
            <div className="space-y-5">
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">WORK ORDER</h4>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 1 Occupation</p>
                <p>The Contractor shall be occupied by the Company as a Teaching Artist.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 2 Remuneration</p>
                <p>Unless specified above, the Contractor will use the remuneration tables on page 3 and 4 and their Level to determine the appropriate remuneration and invoice accordingly. It is the responsibility of the Contractor to track their Level and invoice accurately. All remuneration includes VAT.</p>
                <p className="mt-2">The company shall within 30 days of the invoice issue date.</p>
                <p className="mt-2">Sick days are not compensated</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 3 Travel expenses</p>
                <p>The Company shall bear the Contractor&apos;s necessary travel and accommodation expenses, except food allowances.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 4 Work Order cancellation</p>
                <p>The Company reserves the right to cancel this work order on any date prior to the project.</p>
                <p className="mt-2">The Contractor may only cancel this work order (Section §10 (2) of the Teaching Agreement) due to sickness or special circumstances (To be signed off by the Company). If the Contractor terminates the work order for reasons other than stated, then they are liable for a contractual penalty amounting to EUR 300.00.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">§ 6 Teaching Agreement</p>
                <p>This work order is under the terms of the &apos;Teaching Agreement&apos; previously signed by both parties and may include new amendments.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="p-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">With this signature I accept the Work Order:</p>
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div>
              <div className="h-16 border-b border-zinc-300 dark:border-zinc-700" />
              <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">{taName}</p>
              <p className="text-sm italic text-zinc-500">Teaching Artist (Contractor)</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Berlin, {new Date(wo.created_at).toLocaleDateString()}</p>
              <div className="mt-4">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">C. Justin Beard</p>
                <p className="text-sm text-zinc-500">Chief Executive Officer</p>
                <p className="text-sm text-zinc-500">InterACT English gGmbH</p>
              </div>
            </div>
          </div>
          <div className="mt-8 text-xs text-zinc-400 space-y-0.5">
            <p>Office address: Gneisenaustr. 64, 10961 Berlin, Germany</p>
            <p>Billing address: Planufer 92B, 10967 Berlin, Germany</p>
            <p>Managing Directors: Mark William Hansen & Charles Justin Beard</p>
            <p>Handelsregister - Amtsgericht Charlottenburg - HRB 188932 B</p>
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      {editing ? (
        <div className="mx-auto max-w-3xl rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
          <label className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Internal Notes (not shown to TA)</label>
          <textarea
            value={wo.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            className="mt-2 w-full rounded-lg border border-yellow-300 bg-white px-3 py-2 text-sm dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
            rows={2}
          />
        </div>
      ) : wo.notes ? (
        <div className="mx-auto max-w-3xl rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Internal Notes (not shown to TA)</p>
          <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">{wo.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="flex">
      {label && <dt className="w-56 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}:</dt>}
      <dd className={`text-sm text-zinc-900 dark:text-zinc-50 ${italic ? "italic" : ""} ${!label ? "ml-56" : ""}`}>{value}</dd>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-48 shrink-0">{label}:</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="input flex-1" />
    </div>
  );
}

function EditRow({ label, type: _type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  const [start, end, days] = value.split("|");
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-48 shrink-0">{label}:</label>
      <input type="date" value={start} onChange={(e) => onChange(`${e.target.value}|${end}|${days}`)} className="input w-40" />
      <span className="text-sm text-zinc-500">to</span>
      <input type="date" value={end} onChange={(e) => onChange(`${start}|${e.target.value}|${days}`)} className="input w-40" />
      <input type="number" value={days} onChange={(e) => onChange(`${start}|${end}|${e.target.value}`)} className="input w-20" min={1} />
      <span className="text-sm text-zinc-500">days</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    sent: "bg-blue-100 text-blue-700",
    signed: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || ""}`}>
      {status}
    </span>
  );
}
