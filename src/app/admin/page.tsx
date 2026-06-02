import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ReviewQueue } from "@/components/admin/review-queue";

export default async function AdminDashboard() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  // Stats
  const { count: totalTAs } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta")
    .eq("is_active", true);

  const { count: pendingOnboarding } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta")
    .in("onboarding_status", ["pending", "in_progress"]);

  const { count: readyTAs } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta")
    .eq("onboarding_status", "ready");

  const { count: pendingDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "uploaded");

  const { count: activeWOs } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["sent", "signed"]);

  // Pending reviews
  const { data: pendingReviews } = await supabase
    .from("admin_review_tasks")
    .select(`
      *,
      ta:profiles!admin_review_tasks_ta_id_fkey(id, first_name, last_name, email, photo_url)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const reviewCount = pendingReviews?.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your teaching artist operations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total TAs" value={totalTAs ?? 0} href="/admin/teaching-artists" />
        <StatCard label="Onboarding" value={pendingOnboarding ?? 0} href="/admin/teaching-artists" highlight={!!pendingOnboarding} />
        <StatCard label="Ready to Work" value={readyTAs ?? 0} href="/admin/teaching-artists" />
        <StatCard label="Docs to Review" value={pendingDocs ?? 0} href="#reviews" highlight={!!pendingDocs} />
        <StatCard label="Active Work Orders" value={activeWOs ?? 0} href="/admin/work-orders" />
      </div>

      {/* Review Queue */}
      <div id="reviews">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Review Queue
            </h2>
            {reviewCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {reviewCount} pending
              </span>
            )}
          </div>
        </div>
        <ReviewQueue reviews={pendingReviews || []} />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction href="/admin/teaching-artists" label="Manage TAs" desc="View and invite teaching artists" />
          <QuickAction href="/admin/availability" label="TA Availability" desc="See who's available when" />
          <QuickAction href="/admin/work-orders/new" label="Create Work Order" desc="Assign a project to a TA" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, highlight }: {
  label: string; value: number; href: string; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-5 transition-all hover:shadow-sm ${
        highlight
          ? "border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-900/10"
          : "border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="text-[13px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${
        highlight ? "text-amber-700 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-50"
      }`}>
        {value}
      </p>
    </Link>
  );
}

function QuickAction({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
        <p className="text-[12px] text-zinc-500">{desc}</p>
      </div>
      <svg className="h-4 w-4 shrink-0 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
