import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkOrderPreview } from "@/components/admin/work-order-preview";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_ta_id_fkey(first_name, last_name, email)")
    .eq("id", id)
    .single();

  if (!wo) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <WorkOrderPreview workOrder={wo} />
    </div>
  );
}
