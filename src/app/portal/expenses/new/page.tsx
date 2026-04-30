import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExpenseClaimForm } from "@/components/portal/expense-claim-form";

export default async function NewExpensePage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, project_name, program_type, start_date")
    .eq("ta_id", profile.id)
    .eq("status", "signed")
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        New Expense Claim
      </h2>
      <ExpenseClaimForm workOrders={workOrders || []} />
    </div>
  );
}
