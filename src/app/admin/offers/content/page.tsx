import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { BrochureContentEditor } from "@/components/admin/brochure-content-editor";

export default async function BrochureContentPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: sections } = await supabase
    .from("offer_brochure_content")
    .select("id, title, content, updated_at")
    .order("id");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offer Brochure Content"
        description="Edit the static pages included in every offer PDF."
      />
      <BrochureContentEditor sections={sections || []} />
    </div>
  );
}
