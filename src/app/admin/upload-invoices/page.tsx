import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AdminUploadForm } from "@/components/admin/admin-upload-form";

export default async function UploadInvoicesPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Accounts Payable / DATEV Upload
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload invoices and track payment status
        </p>
      </div>
      <AdminUploadForm />
    </div>
  );
}
