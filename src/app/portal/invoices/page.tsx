import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StatCard, Card, Badge, Button, PageHeader } from "@/components/ui";

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

  const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
    draft: "default",
    submitted: "warning",
    approved: "info",
    paid: "success",
    rejected: "error",
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Invoices" />

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Level" value={profile.pay_level} />
        <StatCard label="Qualifying Projects" value={profile.qualifying_projects} />
        <StatCard label="Total Projects" value={profile.total_projects} />
      </div>

      {/* Upload Invoice */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Upload Invoice
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Upload your own invoice PDF. Our AI will check it has all required information.
            </p>
          </div>
          <Link href="/portal/invoices/upload">
            <Button variant="secondary" size="sm">Upload PDF</Button>
          </Link>
        </div>
      </Card>

      {/* Or use Calculator */}
      {signedWOs && signedWOs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            Or Use Invoice Calculator
          </h3>
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-sm bg-white">
            {signedWOs.map((wo) => (
              <div
                key={wo.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {wo.project_name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {wo.program_type} — {wo.days} days — &euro;{Number(wo.total).toFixed(2)}
                  </p>
                </div>
                <Link href={`/portal/invoices/new/${wo.id}`}>
                  <Button size="sm">Create Invoice</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Invoices */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          Invoice History
        </h3>
        {!invoices || invoices.length === 0 ? (
          <div className="border border-dashed border-neutral-300 bg-white p-8 text-center rounded-sm">
            <p className="text-sm text-neutral-500">No invoices yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-sm bg-white">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Invoice #{inv.invoice_number || inv.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    &euro;{Number(inv.total).toFixed(2)} — {inv.submitted_at ? new Date(inv.submitted_at).toLocaleDateString() : "Draft"}
                  </p>
                </div>
                <Badge variant={statusVariant[inv.status] || "default"}>
                  {inv.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
