import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentManager } from "@/components/portal/document-manager";
import { PageHeader } from "@/components/ui";

export default async function DocumentsPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("ta_id", profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Upload and manage your required documents. Click to preview."
      />
      <DocumentManager profileId={profile.id} documents={documents || []} />
    </div>
  );
}
