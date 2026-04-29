import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SyncJobsButton } from "@/components/admin/sync-jobs-button";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("start_date", { ascending: true });

  const statusStyles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    open: "bg-yellow-100 text-yellow-700",
    assigning: "bg-blue-100 text-blue-700",
    assigned: "bg-green-100 text-green-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-zinc-100 text-zinc-600",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Jobs
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Synced from Monday.com. Click a job to assign TAs.
          </p>
        </div>
        <div className="flex gap-3">
          <SyncJobsButton />
          <Link
            href="https://interactenglish-squad.monday.com/boards/7871804260"
            target="_blank"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            Open in Monday
          </Link>
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No jobs synced yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Click &quot;Sync from Monday&quot; to import jobs, or set up a webhook for automatic sync.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">TAs Needed</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    <Link href={`/admin/jobs/${job.id}`} className="hover:underline">
                      {job.title}
                    </Link>
                    {job.monday_item_id && (
                      <span className="ml-2 text-xs text-zinc-400">#{job.monday_item_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{job.program_type || "—"}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{job.school_state || job.location || "—"}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {job.start_date && job.end_date
                      ? `${job.start_date} — ${job.end_date}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{job.days || "—"}</td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {job.tas_needed}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[job.status] || ""}`}>
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
