import { createClient } from "@/lib/supabase/server";
import { ServicesTable } from "@/components/admin/services-table";

export default async function ServicesPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Services & Rates
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Manage billable add-ons that appear in the TA invoice calculator.
          Changes take effect on new invoices only.
        </p>
      </div>
      <ServicesTable services={services || []} />
    </div>
  );
}
