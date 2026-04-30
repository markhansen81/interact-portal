import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InvoiceCalculator } from "@/components/portal/invoice-calculator";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const { workOrderId } = await params;
  const supabase = await createClient();

  // Get the signed work order
  const { data: workOrder } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", workOrderId)
    .eq("ta_id", profile.id)
    .eq("status", "signed")
    .single();

  if (!workOrder) notFound();

  // Get available services
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  // Get pay scale for rate reference
  const { data: payScales } = await supabase
    .from("pay_scales")
    .select("*")
    .order("scale_type")
    .order("level");

  // Get travel stipends
  const { data: travelStipends } = await supabase
    .from("travel_stipends")
    .select("*")
    .order("min_hours");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Create Invoice
      </h2>
      <InvoiceCalculator
        workOrder={workOrder}
        profile={profile}
        services={services || []}
        payScales={payScales || []}
        travelStipends={travelStipends || []}
      />
    </div>
  );
}
