import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import { WorkOrdersTable } from "@/components/admin/work-orders-table";

export default async function WorkOrdersPage() {
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, project_name, school, start_date, end_date, days, total, status, profiles!work_orders_ta_id_fkey(first_name, last_name, email)")
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Work Orders"
        action={
          <Link href="/admin/work-orders/template">
            <Button variant="secondary">Edit Template</Button>
          </Link>
        }
      />
      <WorkOrdersTable workOrders={(workOrders ?? []) as unknown as Parameters<typeof WorkOrdersTable>[0]["workOrders"]} />
    </div>
  );
}
