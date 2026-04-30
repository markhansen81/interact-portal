"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  notes: string;
}

interface WorkOrder {
  id: string;
  ta_id: string;
  status: string;
  total: number;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    pay_level: number;
  };
}

interface Recommendation {
  ta: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    pay_level: number;
    onboarding_status: string;
  };
  score: number;
  reasons: string[];
  isAvailable: boolean;
}

export function JobDetail({
  job,
  workOrders,
}: {
  job: Job;
  workOrders: WorkOrder[];
}) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [creatingWO, setCreatingWO] = useState<string | null>(null);

  const assignedCount = workOrders.filter(
    (wo) => wo.status === "sent" || wo.status === "signed"
  ).length;
  const remaining = job.tas_needed - assignedCount;

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    setLoadingRecs(true);
    const res = await fetch(`/api/admin/jobs/${job.id}/recommend`);
    const data = await res.json();
    setRecommendations(data.recommendations || []);
    setLoadingRecs(false);
  }

  async function createAndSendWorkOrder(taId: string) {
    setCreatingWO(taId);

    // Create work order from job data
    const res = await fetch("/api/admin/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ta_id: taId,
        job_id: job.id,
        project_name: job.title,
        school: job.school,
        school_address: job.school_address,
        school_state: job.school_state,
        location: job.location,
        start_date: job.start_date,
        end_date: job.end_date,
        days: job.days,
        program_type: job.program_type,
        grade: job.grade,
        accommodation: job.accommodation,
        special_conditions: job.special_conditions,
        co_taught: job.co_taught,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Immediately send to TA
      await fetch(`/api/admin/work-orders/${data.workOrder.id}/send`, {
        method: "POST",
      });
      router.refresh();
      loadRecommendations();
    }

    setCreatingWO(null);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left — Job Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Job Info Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Job Details
            </h3>
            {job.monday_item_id && (
              <a
                href={`https://interactenglish-squad.monday.com/boards/7871804260/pulses/${job.monday_item_id}`}
                target="_blank"
                className="text-sm text-blue-600 hover:underline"
              >
                View in Monday
              </a>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Program Type" value={job.program_type} />
            <Field label="Days" value={job.days?.toString()} />
            <Field label="Dates" value={`${job.start_date} — ${job.end_date}`} />
            <Field label="Location" value={job.school_state || job.location} />
            <Field label="Address" value={job.school_address} />
            <Field label="Grade" value={job.grade} />
            <Field label="Accommodation" value={job.accommodation} />
            <Field label="Co-taught" value={job.co_taught ? "Yes" : "No"} />
            {job.special_conditions && (
              <div className="col-span-2">
                <dt className="text-sm text-zinc-500">Special Conditions</dt>
                <dd className="mt-1 text-sm italic text-zinc-900 dark:text-zinc-50">{job.special_conditions}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Assigned TAs / Work Orders */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Assigned TAs ({assignedCount}/{job.tas_needed})
          </h3>
          {workOrders.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No TAs assigned yet. Use the recommendations below.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {workOrders.map((wo) => {
                const ta = wo.profiles;
                return (
                  <div
                    key={wo.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {ta.first_name} {ta.last_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Level {ta.pay_level} — {wo.total ? `€${Number(wo.total).toFixed(2)}` : "Rate TBD"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        wo.status === "signed"
                          ? "bg-green-100 text-green-700"
                          : wo.status === "sent"
                            ? "bg-blue-100 text-blue-700"
                            : wo.status === "declined"
                              ? "bg-red-100 text-red-700"
                              : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {wo.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TA Recommendations */}
        {remaining > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Recommended TAs
              </h3>
              <span className="text-sm text-zinc-500">
                {remaining} more TA{remaining > 1 ? "s" : ""} needed
              </span>
            </div>

            {loadingRecs ? (
              <p className="mt-4 text-sm text-zinc-500">Loading recommendations...</p>
            ) : recommendations.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No recommendations available.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {recommendations.slice(0, 15).map((rec) => (
                  <div
                    key={rec.ta.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          rec.score >= 60
                            ? "bg-green-100 text-green-700"
                            : rec.score >= 40
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {rec.score}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {rec.ta.first_name} {rec.ta.last_name || rec.ta.email}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Level {rec.ta.pay_level} —{" "}
                          {rec.reasons.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => createAndSendWorkOrder(rec.ta.id)}
                      disabled={creatingWO === rec.ta.id}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      {creatingWO === rec.ta.id ? "Sending..." : "Send Work Order"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right — Summary */}
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500">Staffing Status</h3>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {assignedCount} / {job.tas_needed}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {remaining > 0
              ? `${remaining} more TA${remaining > 1 ? "s" : ""} needed`
              : "Fully staffed"}
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{
                width: `${Math.min(100, (assignedCount / job.tas_needed) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500">Job Status</h3>
          <p className="mt-2 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
            {job.status.replace("_", " ")}
          </p>
        </div>

        {job.monday_item_id && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium text-zinc-500">Monday.com</h3>
            <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
              Item #{job.monday_item_id}
            </p>
            <a
              href={`https://interactenglish-squad.monday.com/boards/7871804260/pulses/${job.monday_item_id}`}
              target="_blank"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              Open in Monday
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
        {value || "—"}
      </dd>
    </div>
  );
}
