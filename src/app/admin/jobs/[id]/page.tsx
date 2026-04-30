import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { JobDetail } from "@/components/admin/job-detail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_ta_id_fkey(first_name, last_name, email, pay_level)")
    .eq("job_id", id);

  // Get activity log for this job
  const { data: activityLog } = await supabase
    .from("activity_log")
    .select("*, performer:profiles!activity_log_performed_by_fkey(first_name, last_name), ta:profiles!activity_log_ta_id_fkey(first_name, last_name, email)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/jobs" className="text-sm text-zinc-500 hover:text-zinc-700">&larr; Back</Link>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{job.title}</h2>
      </div>
      <JobDetail job={job} workOrders={workOrders || []} />

      {/* Activity Log */}
      {activityLog && activityLog.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity Log</h3>
          <div className="mt-4 space-y-3">
            {activityLog.map((entry) => {
              const performer = entry.performer as { first_name: string; last_name: string } | null;
              const ta = entry.ta as { first_name: string; last_name: string; email: string } | null;

              const actionStyles: Record<string, string> = {
                work_order_sent: "text-blue-600",
                work_order_signed: "text-green-600",
                work_order_declined: "text-red-600",
                work_order_cancelled: "text-red-600",
              };

              const actionLabels: Record<string, string> = {
                work_order_sent: "Sent",
                work_order_signed: "Signed",
                work_order_declined: "Declined",
                work_order_cancelled: "Cancelled",
              };

              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    entry.action.includes("signed") ? "bg-green-500" :
                    entry.action.includes("declined") || entry.action.includes("cancelled") ? "bg-red-500" :
                    "bg-blue-500"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-zinc-900 dark:text-zinc-50">
                      <span className={`font-medium ${actionStyles[entry.action] || ""}`}>
                        {actionLabels[entry.action] || entry.action}
                      </span>
                      {ta && (
                        <span className="text-zinc-500">
                          {" — "}{ta.first_name} {ta.last_name || ta.email}
                        </span>
                      )}
                    </p>
                    {entry.details && (
                      <p className="text-xs text-zinc-500">{entry.details}</p>
                    )}
                    <p className="text-[10px] text-zinc-400">
                      {new Date(entry.created_at).toLocaleString()}
                      {performer && ` by ${performer.first_name} ${performer.last_name}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
