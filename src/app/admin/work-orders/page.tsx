import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function WorkOrdersPage() {
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_ta_id_fkey(first_name, last_name, email)")
    .order("created_at", { ascending: false });

  const statusStyles: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600",
    sent: "bg-blue-100 text-blue-700",
    signed: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">
          Work Orders
        </h2>
        <div className="flex gap-3">
          <Link
            href="/admin/work-orders/template"
            className="rounded-sm border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Edit Template
          </Link>
          <Link
            href="/admin/work-orders/new"
            className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create Work Order
          </Link>
        </div>
      </div>

      {!workOrders || workOrders.length === 0 ? (
        <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">No work orders yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">TA</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {workOrders.map((wo) => {
                const ta = wo.profiles as { first_name: string; last_name: string; email: string } | null;
                return (
                  <tr key={wo.id} className="cursor-pointer hover:bg-neutral-50" onClick={() => {}}>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                      <Link href={`/admin/work-orders/${wo.id}`} className="hover:underline">
                        {wo.project_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{wo.school || "—"}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {wo.start_date} — {wo.end_date}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
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
