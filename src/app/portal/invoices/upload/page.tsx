import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InvoiceUploader } from "@/components/portal/invoice-uploader";

export default async function UploadInvoicePage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  // Get signed work orders without invoices
  const { data: signedWOs } = await supabase
    .from("work_orders")
    .select("id, project_name, days, total, program_type, start_date, end_date")
    .eq("ta_id", profile.id)
    .eq("status", "signed");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Upload Invoice
      </h2>
      <InvoiceUploader
        workOrders={signedWOs || []}
        profile={profile}
      />
    </div>
  );
}
