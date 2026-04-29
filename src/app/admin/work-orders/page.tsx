import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function WorkOrdersPage() {
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_ta_id_fkey(first_name, last_name, email)")
    .order("created_at", { ascending: false });

  const statusStyles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    sent: "bg-blue-100 text-blue-700",
    signed: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Work Orders
        </h2>
        <Link
          href="/admin/work-orders/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Create Work Order
        </Link>
      </div>

      {!workOrders || workOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No work orders yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">TA</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {workOrders.map((wo) => {
                const ta = wo.profiles as { first_name: string; last_name: string; email: string } | null;
                return (
                  <tr key={wo.id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" onClick={() => {}}>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      <Link href={`/admin/work-orders/${wo.id}`} className="hover:underline">
                        {wo.project_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">{wo.school || "—"}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {wo.start_date} — {wo.end_date}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {wo.total ? `€${Number(wo.total).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[wo.status] || ""}`}>
                        {wo.status}
                      </span>
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
