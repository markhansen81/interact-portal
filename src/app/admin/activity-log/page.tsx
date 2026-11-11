import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const adminClient = createAdminClient();

  let query = adminClient
    .from("activity_log")
    .select(`
      id, action, details, created_at, job_id, work_order_id, ta_id,
      performer:profiles!activity_log_performed_by_fkey(first_name, last_name, email),
      ta:profiles!activity_log_ta_id_fkey(first_name, last_name, email)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (sp.action) {
    query = query.eq("action", sp.action);
  }

  const { data: logs, count } = await query;

  // Get distinct actions for filter
  const { data: actionRows } = await adminClient
    .from("activity_log")
    .select("action");
  const actions = Array.from(new Set((actionRows || []).map((r) => r.action))).sort();

  const totalPages = count ? Math.ceil(count / pageSize) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Admin actions: work orders sent, documents reviewed, invoices approved, etc."
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/activity-log"
          className={`rounded-sm px-3 py-1.5 text-xs font-medium border transition-colors ${
            !sp.action ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          All
        </Link>
        {actions.map((action) => (
          <Link
            key={action}
            href={`/admin/activity-log?action=${encodeURIComponent(action)}`}
            className={`rounded-sm px-3 py-1.5 text-xs font-medium border transition-colors ${
              sp.action === action ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {action.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="text-xs text-neutral-400">
        {count?.toLocaleString()} entries{sp.action ? ` matching "${sp.action}"` : ""}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">When</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">TA</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Performed By</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {(logs || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400">No activity logged yet</td>
              </tr>
            ) : (
              (logs || []).map((log) => {
                const performer = log.performer as unknown as { first_name: string | null; last_name: string | null; email: string } | null;
                const ta = log.ta as unknown as { first_name: string | null; last_name: string | null; email: string } | null;
                const performerName = performer
                  ? performer.first_name && performer.last_name
                    ? `${performer.first_name} ${performer.last_name}`
                    : performer.email
                  : "—";
                const taName = ta
                  ? ta.first_name && ta.last_name
                    ? `${ta.first_name} ${ta.last_name}`
                    : ta.email
                  : null;

                return (
                  <tr key={log.id} className="hover:bg-neutral-50/50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                      {new Date(log.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600 max-w-xs truncate" title={log.details || ""}>
                      {log.details || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {taName ? (
                        <Link href={`/admin/teaching-artists/${log.ta_id}`} className="hover:underline">
                          {taName}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{performerName}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex gap-2">
                        {log.work_order_id && (
                          <Link href={`/admin/work-orders/${log.work_order_id}`} className="text-blue-600 hover:underline">WO</Link>
                        )}
                        {log.job_id && (
                          <Link href={`/admin/jobs`} className="text-neutral-500 hover:underline">Job</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/activity-log?${sp.action ? `action=${encodeURIComponent(sp.action)}&` : ""}page=${page - 1}`}
                className="rounded-sm border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/activity-log?${sp.action ? `action=${encodeURIComponent(sp.action)}&` : ""}page=${page + 1}`}
                className="rounded-sm border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
