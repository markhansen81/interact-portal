import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProgramFormEditor } from "@/components/admin/program-form-editor";

export default async function AdminProgramsFormPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: content } = await supabase
    .from("form_content")
    .select("*")
    .eq("form_id", "programs");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Edit Programs Form
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Edit the content TAs see when going through programs onboarding. Click any text to edit.
        </p>
      </div>
      <ProgramFormEditor initialContent={content || []} />
    </div>
  );
}
