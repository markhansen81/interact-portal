import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ReviewQueue } from "@/components/admin/review-queue";

export default async function AdminDashboard() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

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

  // --- Alert counts ---
  // Expiring documents (within 30 days)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString();
  const { count: expiringDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .lt("expiry_date", thirtyDaysFromNow)
    .gt("expiry_date", new Date().toISOString())
    .eq("status", "approved");

  // Unsigned WOs >14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { count: unsignedWOs } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .lt("created_at", fourteenDaysAgo);

  // Pending invoices
  const { count: pendingInvoices } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted");

  // Onboarding stalled >30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: stalledOnboarding } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta")
    .in("onboarding_status", ["pending", "in_progress"])
    .lt("created_at", thirtyDaysAgo);

  // Pending expenses
  const { count: pendingExpenses } = await supabase
    .from("expense_claims")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted");

  // Failed insurance orders (email not delivered)
  const { count: failedInsurance } = await supabase
    .from("insurance_orders")
    .select("*", { count: "exact", head: true })
    .is("email_sent_at", null);

  // Pending reviews
  const { data: pendingReviews } = await supabase
    .from("admin_review_tasks")
    .select(`
      *,
      ta:profiles!admin_review_tasks_ta_id_fkey(id, first_name, last_name, email, photo_url)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Get documents for doc reviews
  const { data: allDocs } = await supabase
    .from("documents")
    .select("ta_id, type, file_url, status, uploaded_at, issue_date, expiry_date")
    .eq("status", "uploaded");

  const docMap = new Map<string, { file_url: string | null; uploaded_at: string | null; issue_date: string | null; expiry_date: string | null }>();
  (allDocs || []).forEach((d) => docMap.set(`${d.ta_id}:${d.type}`, d));

  // Attach docs to reviews
  const reviewsWithDocs = (pendingReviews || []).map((r) => ({
    ...r,
    document: r.type === "document_upload" && r.reference_id
      ? docMap.get(`${r.ta_id}:${r.reference_id}`) || null
      : null,
  }));

  const reviewCount = reviewsWithDocs.length;

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

      {/* Alerts */}
      <AlertsPanel
        expiringDocs={expiringDocs ?? 0}
        unsignedWOs={unsignedWOs ?? 0}
        pendingInvoices={pendingInvoices ?? 0}
        stalledOnboarding={stalledOnboarding ?? 0}
        pendingExpenses={pendingExpenses ?? 0}
        failedInsurance={failedInsurance ?? 0}
      />

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
        <ReviewQueue reviews={reviewsWithDocs} />
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

function AlertsPanel({
  expiringDocs,
  unsignedWOs,
  pendingInvoices,
  stalledOnboarding,
  pendingExpenses,
  failedInsurance,
}: {
  expiringDocs: number;
  unsignedWOs: number;
  pendingInvoices: number;
  stalledOnboarding: number;
  pendingExpenses: number;
  failedInsurance: number;
}) {
  const urgent = [
    {
      label: "Insurance orders not delivered",
      count: failedInsurance,
      href: "/admin/insurance-orders",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      label: "Documents expiring within 30 days",
      count: expiringDocs,
      href: "/admin/teaching-artists",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      label: "Unsigned work orders (>14 days)",
      count: unsignedWOs,
      href: "/admin/work-orders",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0h3m-3 0v3m0-3v-3m-6-1.5H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ].filter((a) => a.count > 0);

  const warnings = [
    {
      label: "Pending invoice approvals",
      count: pendingInvoices,
      href: "/admin/invoices",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
    {
      label: "Onboarding stalled (>30 days)",
      count: stalledOnboarding,
      href: "/admin/teaching-artists",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Expense claims pending review",
      count: pendingExpenses,
      href: "#",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
        </svg>
      ),
    },
  ].filter((a) => a.count > 0);

  if (urgent.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Alerts</h2>
      <div className="space-y-2">
        {urgent.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 transition-all hover:border-red-300 hover:shadow-sm dark:border-red-900/40 dark:bg-red-900/10"
          >
            <span className="text-red-600 dark:text-red-400">{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-red-800 dark:text-red-300">
              {item.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {item.count}
            </span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">View</span>
          </Link>
        ))}
        {warnings.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-all hover:border-amber-300 hover:shadow-sm dark:border-amber-900/40 dark:bg-amber-900/10"
          >
            <span className="text-amber-600 dark:text-amber-400">{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
              {item.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {item.count}
            </span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">View</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
