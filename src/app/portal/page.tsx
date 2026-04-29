import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";

export default async function PortalDashboard() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  // Get pending work orders
  const { count: pendingWOs } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", profile.id)
    .eq("status", "sent");

  // Get unsigned documents
  const { count: pendingDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", profile.id)
    .in("status", ["not_uploaded", "expiring"]);

  // Get unpaid invoices
  const { count: unpaidInvoices } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", profile.id)
    .in("status", ["submitted", "approved"]);

  // Get unread messages
  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", profile.id)
    .is("read_at", null);

  const onboardingComplete = profile.onboarding_status === "ready";
  const levelProgress = profile.qualifying_projects % 5;
  const nextLevelAt = 5 - levelProgress;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        My Dashboard
      </h2>

      {/* Onboarding Banner */}
      {!onboardingComplete && (
        <Link
          href="/portal/onboarding"
          className="block rounded-xl border border-yellow-200 bg-yellow-50 p-6 hover:border-yellow-300 dark:border-yellow-900/30 dark:bg-yellow-900/10"
        >
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
            Complete Your Onboarding
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-500">
            Your profile setup is not complete. Click here to continue.
          </p>
        </Link>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Work Orders"
          value={pendingWOs ?? 0}
          href="/portal/work-orders"
          highlight={!!pendingWOs}
        />
        <StatCard
          label="Documents to Update"
          value={pendingDocs ?? 0}
          href="/portal/documents"
          highlight={!!pendingDocs}
        />
        <StatCard
          label="Unpaid Invoices"
          value={unpaidInvoices ?? 0}
          href="/portal/invoices"
        />
        <StatCard
          label="Unread Messages"
          value={unreadMessages ?? 0}
          href="/portal/messages"
          highlight={!!unreadMessages}
        />
      </div>

      {/* Level Tracker */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-500">Pay Level</h3>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Level {profile.pay_level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">
              {profile.qualifying_projects} qualifying projects
            </p>
            <p className="text-sm text-zinc-500">
              {profile.total_projects} total projects
            </p>
            {profile.pay_level < 6 && (
              <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {nextLevelAt} more to next level
              </p>
            )}
          </div>
        </div>
        {profile.pay_level < 6 && (
          <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${(levelProgress / 5) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Training Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrainingCard
          label="Online Onboarding"
          done={profile.training_online}
        />
        <TrainingCard
          label="Offline Foundation"
          done={profile.training_offline}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-6 transition-colors hover:border-zinc-300 ${
        highlight
          ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-900/10"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </Link>
  );
}

function TrainingCard({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </p>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            done
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
          }`}
        >
          {done ? "Complete" : "Not complete"}
        </span>
      </div>
    </div>
  );
}
