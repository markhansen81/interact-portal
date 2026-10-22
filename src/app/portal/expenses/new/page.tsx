import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExpenseClaimForm } from "@/components/portal/expense-claim-form";
import { PageHeader } from "@/components/ui";

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
      <PageHeader title="New Expense Claim" />
      <ExpenseClaimForm workOrders={workOrders || []} />
    </div>
  );
}
