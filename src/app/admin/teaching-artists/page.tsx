import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { InviteTAButton } from "@/components/admin/invite-ta-button";

export default async function TeachingArtistsPage() {
  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "ta")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Teaching Artists
        </h2>
        <InviteTAButton />
      </div>

      {!tas || tas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No teaching artists yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Invite your first TA to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Onboarding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Training
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Projects
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tas.map((ta) => (
                <tr
                  key={ta.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/teaching-artists/${ta.id}`}
                      className="flex items-center gap-3"
                    >
                      {ta.photo_url ? (
                        <img
                          src={ta.photo_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {ta.first_name && ta.last_name
                          ? `${ta.first_name} ${ta.last_name}`
                          : ta.email}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {ta.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {ta.category || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      Level {ta.pay_level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <OnboardingBadge status={ta.onboarding_status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <TrainingDot
                        done={ta.training_online}
                        label="Online"
                      />
                      <TrainingDot
                        done={ta.training_offline}
                        label="Offline"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {ta.qualifying_projects}/{ta.total_projects}
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

function OnboardingBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_progress:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    awaiting_documents:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    ready:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    awaiting_documents: "Awaiting Docs",
    ready: "Ready",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}
    >
      {labels[status] || status}
    </span>
  );
}

function TrainingDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${done ? "Complete" : "Not complete"}`}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
        done
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
      }`}
    >
      {label[0]}
    </span>
  );
}
