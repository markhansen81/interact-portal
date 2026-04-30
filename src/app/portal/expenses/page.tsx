import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ExpensesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  const { data: claims } = await supabase
    .from("expense_claims")
    .select("*, expense_items(*)")
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Expense Reimbursements
        </h2>
        <Link
          href="/portal/expenses/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New Claim
        </Link>
      </div>

      {!claims || claims.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No expense claims yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Submit receipts for travel, accommodation, and other project costs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const itemCount = (claim.expense_items as unknown[])?.length || 0;
            return (
              <div
                key={claim.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Expense Claim — {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {claim.submitted_at
                      ? `Submitted ${new Date(claim.submitted_at).toLocaleDateString()}`
                      : "Draft"}
                    {claim.total && ` — €${Number(claim.total).toFixed(2)}`}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[claim.status] || ""}`}
                >
                  {claim.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
