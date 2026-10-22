import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge, Button, PageHeader } from "@/components/ui";

export default async function ExpensesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  const { data: claims } = await supabase
    .from("expense_claims")
    .select("*, expense_items(*)")
    .eq("ta_id", profile.id)
    .order("created_at", { ascending: false });

  const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
    draft: "default",
    submitted: "warning",
    approved: "info",
    paid: "success",
    rejected: "error",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Reimbursements"
        action={
          <Link href="/portal/expenses/new">
            <Button size="sm">New Claim</Button>
          </Link>
        }
      />

      {!claims || claims.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
          <p className="text-neutral-500">No expense claims yet.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Submit receipts for travel, accommodation, and other project costs.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-sm bg-white">
          {claims.map((claim) => {
            const itemCount = (claim.expense_items as unknown[])?.length || 0;
            return (
              <div
                key={claim.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Expense Claim — {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {claim.submitted_at
                      ? `Submitted ${new Date(claim.submitted_at).toLocaleDateString()}`
                      : "Draft"}
                    {claim.total && ` — \u20AC${Number(claim.total).toFixed(2)}`}
                  </p>
                </div>
                <Badge variant={statusVariant[claim.status] || "default"}>
                  {claim.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
