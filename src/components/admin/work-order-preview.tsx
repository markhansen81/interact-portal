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

export function WorkOrderPreview({ workOrder: wo }: { workOrder: WorkOrder }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/work-orders"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            &larr; Back
          </Link>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Work Order
          </h2>
          <StatusBadge status={wo.status} />
        </div>
        {wo.sign_by && (
          <span className={`text-sm ${new Date(wo.sign_by) < new Date() ? "text-red-600" : "text-zinc-500"}`}>
            Sign by: {wo.sign_by}
          </span>
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
      </div>

      {/* Rendered Work Order Document */}
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                WORK ORDER
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                InterACT English gGmbH
              </p>
            </div>
            <div className="text-right text-xs text-zinc-400">
              <p>InterACT English gGmbH</p>
              <p>Planufer 92B, 10967 Berlin</p>
              <p>Tel. 030 20339702</p>
              <p>info@interactenglish.de</p>
              <p className="mt-2 font-medium text-green-600">
                Project ID: {wo.project_id_internal}
              </p>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">By and between</p>
          <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">
            InterACT English gGmbH
          </p>
          <p className="text-sm text-zinc-500">
            (referred to in the following as &quot;the Company&quot;)
          </p>
          <p className="mt-4 text-sm text-zinc-500">and:</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {taName}
          </p>
          <p className="text-sm text-zinc-500">
            (referred to in the following as &quot;the Contractor&quot;)
          </p>
        </div>

        {/* Project Details */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Project Details
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
            The Contractor shall be teaching on the following project (Project details are subject to change):
          </p>

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
        </div>

        {/* Remuneration */}
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Remuneration
          </h3>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {wo.total ? `€${Number(wo.total).toFixed(2)}` : "As per pay scale"}
          </p>
          {wo.daily_rate && (
            <p className="text-sm text-zinc-500">
              Based on TA pay level — {wo.days} day{wo.days > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Important Notes */}
        <div className="border-b border-zinc-200 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            IMPORTANT: Before signing this work order please consider:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>We require all TAs to travel the day before the project if outside their home city. Travel the day before is included in the flat-fee. Please do not sign this work order if travel the day before is an issue.</li>
            <li>Check the address of the school/hostel you will travel to. Some projects require longer travel time.</li>
            <li>Check the area/city/village you are traveling to. Most projects will have you arriving in the evening and often on Sunday. Finding food can be difficult in rural locations.</li>
            <li>Please CAREFULLY read the project notes prepared for you in the project folder the week before traveling.</li>
            <li>Double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance.</li>
          </ol>
        </div>

        {/* Signature Area */}
        <div className="p-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            If you would like to decline this work order but are still available, feel free to send us your reasons. We may have alternative projects available.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div>
              <div className="h-16 border-b border-zinc-300 dark:border-zinc-700" />
              <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">
                {taName}
              </p>
              <p className="text-sm italic text-zinc-500">
                Teaching Artist (Contractor)
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">
                Berlin, {new Date(wo.created_at).toLocaleDateString()}
              </p>
              <div className="mt-4">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  C. Justin Beard
                </p>
                <p className="text-sm text-zinc-500">Chief Executive Officer</p>
                <p className="text-sm text-zinc-500">InterACT English gGmbH</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      {wo.notes && (
        <div className="mx-auto max-w-3xl rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
            Internal Notes (not shown to TA)
          </p>
          <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">
            {wo.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  italic,
}: {
  label: string;
  value: string;
  italic?: boolean;
}) {
  return (
    <div className="flex">
      {label && (
        <dt className="w-56 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}:
        </dt>
      )}
      <dd
        className={`text-sm text-zinc-900 dark:text-zinc-50 ${italic ? "italic" : ""} ${!label ? "ml-56" : ""}`}
      >
        {value}
      </dd>
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
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || ""}`}
    >
      {status}
    </span>
  );
}
