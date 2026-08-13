import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InsuranceOrdersTable } from "@/components/admin/insurance-orders-table";

export default async function InsuranceOrdersPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("insurance_orders")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Insurance Orders
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Project insurance purchases from Squarespace.
        </p>
      </div>
      <InsuranceOrdersTable orders={orders || []} />
    </div>
  );
}
