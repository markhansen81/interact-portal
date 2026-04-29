import { createClient } from "@/lib/supabase/server";
import { WorkOrderForm } from "@/components/admin/work-order-form";

export default async function NewWorkOrderPage() {
  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, pay_level, camp_level")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  const { data: payScales } = await supabase
    .from("pay_scales")
    .select("*")
    .order("scale_type")
    .order("level", { ascending: true });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Create Work Order
      </h2>
      <WorkOrderForm tas={tas || []} payScales={payScales || []} />
    </div>
  );
}
