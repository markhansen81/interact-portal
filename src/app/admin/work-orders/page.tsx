import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PageHeader, Badge, Button } from "@/components/ui";

export default async function WorkOrdersPage() {
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_ta_id_fkey(first_name, last_name, email)")
    .order("created_at", { ascending: false });

  const statusVariants: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    draft: "default",
    sent: "info",
    signed: "success",
    declined: "error",
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Work Orders"
        action={
          <div className="flex gap-3">
            <Link href="/admin/work-orders/template">
              <Button variant="secondary">Edit Template</Button>
            </Link>
            <Link href="/admin/work-orders/new">
              <Button>Create Work Order</Button>
            </Link>
          </div>
        }
      />

      {!workOrders || workOrders.length === 0 ? (
        <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">No work orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Project</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">TA</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">School</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Dates</th>
                <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Total</th>
                <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => {
                const ta = wo.profiles as { first_name: string; last_name: string; email: string } | null;
                return (
                  <tr key={wo.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="py-4 pr-6 font-medium text-neutral-900">
                      <Link href={`/admin/work-orders/${wo.id}`} className="hover:underline">
                        {wo.project_name}
                      </Link>
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">{wo.school || "—"}</td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {wo.start_date} — {wo.end_date}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {wo.total ? `€${Number(wo.total).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-4">
                      <Badge variant={statusVariants[wo.status] || "default"}>
                        {wo.status}
                      </Badge>
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
