import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SyncJobsButton } from "@/components/admin/sync-jobs-button";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, work_orders(id, ta_id, status)")
    .order("start_date", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Jobs</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Synced from Monday. Click a job to assign TAs and send work orders.
          </p>
        </div>
        <div className="flex gap-3">
          <SyncJobsButton />
          <Link
            href="https://interactenglish-squad.monday.com/boards/7871804260"
            target="_blank"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            Monday Board
          </Link>
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No jobs synced yet.</p>
          <p className="mt-1 text-sm text-zinc-400">Click &quot;Sync from Monday&quot; to import.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Job</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dates</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Days</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Staffing</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">WOs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {jobs.map((job) => {
                const wos = (job.work_orders || []) as { id: string; ta_id: string; status: string }[];
                const sent = wos.filter((w) => w.status === "sent").length;
                const signed = wos.filter((w) => w.status === "signed").length;
                const total = wos.length;
                const needed = job.tas_needed || 0;
                const remaining = Math.max(0, needed - signed);

                const isFullyStaffed = remaining === 0 && needed > 0;
                const needsAttention = remaining > 0 && sent === 0 && needed > 0;

                return (
                  <tr
                    key={job.id}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${needsAttention ? "bg-yellow-50/50 dark:bg-yellow-900/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/jobs/${job.id}`} className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{job.program_type || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{job.school_state || "—"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">
                      {job.start_date ? `${job.start_date} — ${job.end_date}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-500">{job.days || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {needed > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className={`h-1.5 rounded-full ${isFullyStaffed ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(100, (signed / needed) * 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${isFullyStaffed ? "text-green-600" : remaining > 0 ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}>
                            {signed}/{needed}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {total > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {signed > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-100 px-1.5 text-[10px] font-bold text-green-700" title="Signed">{signed}</span>}
                          {sent > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700" title="Sent, waiting">{sent}</span>}
                          {wos.filter((w) => w.status === "draft").length > 0 && (
                            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[10px] font-bold text-zinc-500" title="Draft">
                              {wos.filter((w) => w.status === "draft").length}
                            </span>
                          )}
                        </div>
                      ) : remaining > 0 ? (
                        <span className="text-xs text-yellow-600 font-medium">{remaining} to send</span>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
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
