"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignaturePad } from "@/components/shared/signature-pad";

interface WorkOrder {
  id: string;
  project_name: string;
  school: string;
  school_address: string;
  school_state: string;
  location: string;
  start_date: string;
  end_date: string;
  days: number;
  program_type: string;
  special_conditions: string;
  co_taught: boolean;
  grade: string;
  accommodation: string;
  total: number;
  status: string;
  sign_by: string | null;
  created_at: string;
}

export function TAWorkOrderView({
  workOrder: wo,
  taName,
}: {
  workOrder: WorkOrder;
  taName: string;
}) {
  const router = useRouter();
  const [showSign, setShowSign] = useState(false);
  const [declining, setDeclining] = useState(false);

  async function handleSign(signatureData: {
    signature_png: string;
    signature_type: string;
    typed_name?: string;
    timestamp: string;
  }) {
    await fetch(`/api/portal/work-orders/${wo.id}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signatureData),
    });
    router.push("/portal/work-orders");
    router.refresh();
  }

  async function handleDecline() {
    setDeclining(true);
    await fetch(`/api/portal/work-orders/${wo.id}/decline`, {
      method: "POST",
    });
    router.push("/portal/work-orders");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/portal/work-orders"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to Work Orders
      </Link>

      {/* Work Order Document */}
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            WORK ORDER
          </h1>
          <p className="mt-1 text-sm text-zinc-500">InterACT English gGmbH</p>
        </div>

        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">By and between</p>
          <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">
            InterACT English gGmbH
          </p>
          <p className="mt-4 text-sm text-zinc-500">and:</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {taName}
          </p>
        </div>

        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Project Details
          </h3>
          <dl className="mt-4 space-y-2">
            <Row label="Date" value={`${wo.start_date} — ${wo.end_date}, ${wo.days} day${wo.days > 1 ? "s" : ""}`} />
            <Row label="Organisation" value={wo.school} />
            {wo.school_address && <Row label="Address" value={wo.school_address} />}
            {wo.school_state && <Row label="State" value={wo.school_state} />}
            <Row label="Project type" value={wo.program_type} />
            {wo.special_conditions && <Row label="Special conditions" value={wo.special_conditions} />}
            <Row label="Co taught" value={wo.co_taught ? "Co taught" : "Not co taught"} />
            {wo.grade && <Row label="Grade" value={wo.grade} />}
            {wo.accommodation && <Row label="Accommodation" value={wo.accommodation} />}
          </dl>
        </div>

        {wo.total && (
          <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Remuneration
            </h3>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              €{Number(wo.total).toFixed(2)}
            </p>
          </div>
        )}

        {/* Important Notes */}
        <div className="border-b border-zinc-200 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            IMPORTANT: Before signing please consider:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Travel the day before is required if outside your home city.</li>
            <li>Check the school/hostel address and travel time.</li>
            <li>Rural locations may have limited food options — pack accordingly.</li>
            <li>Read project notes carefully the week before traveling.</li>
            <li>Double check all connections and transfers in advance.</li>
          </ol>
        </div>

        {/* Signature / Actions */}
        <div className="p-8">
          {wo.status === "sent" && !showSign && (
            <div className="space-y-4">
              {wo.sign_by && (
                <div className={`rounded-lg p-3 ${
                  new Date(wo.sign_by) < new Date()
                    ? "bg-red-50 dark:bg-red-900/10"
                    : "bg-yellow-50 dark:bg-yellow-900/10"
                }`}>
                  <p className={`text-sm font-medium ${
                    new Date(wo.sign_by) < new Date()
                      ? "text-red-700 dark:text-red-400"
                      : "text-yellow-700 dark:text-yellow-400"
                  }`}>
                    {new Date(wo.sign_by) < new Date()
                      ? `Overdue — was due ${wo.sign_by}`
                      : `Please sign by ${wo.sign_by}`}
                  </p>
                </div>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Please review the work order above carefully before signing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSign(true)}
                  className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
                >
                  Accept & Sign
                </button>
                <button
                  onClick={handleDecline}
                  disabled={declining}
                  className="rounded-lg border border-red-300 px-6 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  {declining ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          )}

          {wo.status === "sent" && showSign && (
            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Sign Work Order
              </h3>
              <SignaturePad onSign={handleSign} signerName={taName} />
              <button
                onClick={() => setShowSign(false)}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
            </div>
          )}

          {wo.status === "signed" && (
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/10">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                This work order has been signed.
              </p>
            </div>
          )}

          {wo.status === "declined" && (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                This work order was declined.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <dt className="w-48 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}:
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}
