import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TAInvoicesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  const { data: signedWOs } = await supabase
    .from("work_orders")
    .select("id, project_name, days, total, program_type")
    .eq("ta_id", profile.id)
    .eq("status", "signed");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("ta_id", profile.id)
    .order("created_at", { ascending: false });

  const statusStyles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    submitted: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Invoices
      </h2>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Level</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {profile.pay_level}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Qualifying Projects</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {profile.qualifying_projects}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Total Projects</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {profile.total_projects}
          </p>
        </div>
      </div>

      {/* Create Invoice from Signed Work Order */}
      {signedWOs && signedWOs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Create Invoice
          </h3>
          <div className="space-y-2">
            {signedWOs.map((wo) => (
              <div
                key={wo.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {wo.project_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {wo.program_type} — {wo.days} days — €{Number(wo.total).toFixed(2)}
                  </p>
                </div>
                <button className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
                  Create Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Invoices */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Invoice History
        </h3>
        {!invoices || invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Invoice #{inv.invoice_number || inv.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    €{Number(inv.total).toFixed(2)} — {inv.submitted_at ? new Date(inv.submitted_at).toLocaleDateString() : "Draft"}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[inv.status] || ""}`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
