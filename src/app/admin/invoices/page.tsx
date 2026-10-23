import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FinancialDashboard } from "@/components/admin/financial-dashboard";

export default async function InvoicesPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, profiles!invoices_ta_id_fkey(id, first_name, last_name, email, photo_url)")
    .order("created_at", { ascending: false });

  const { data: expenses } = await supabase
    .from("expense_claims")
    .select("*, profiles!expense_claims_ta_id_fkey(id, first_name, last_name, email, photo_url), expense_items(id, description, amount, category, receipt_url)")
    .order("created_at", { ascending: false });

  const { data: adminUploads } = await supabase
    .from("admin_uploads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Financial Management
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Review invoices, approve payments, and manage expense claims.
        </p>
      </div>
      <FinancialDashboard invoices={invoices || []} expenses={expenses || []} adminUploads={adminUploads || []} />
    </div>
  );
}
