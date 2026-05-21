import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/portal/onboarding-wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const { task } = await searchParams;

  // No task specified — go to portal dashboard (it has the task list)
  if (!task) {
    redirect("/portal");
  }

  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("ta_id", profile.id);

  const { data: preferences } = await supabase
    .from("ta_program_preferences")
    .select("*")
    .eq("ta_id", profile.id);

  const { data: formContent } = await supabase
    .from("form_content")
    .select("*")
    .eq("form_id", "programs");

  return (
    <OnboardingWizard
      profile={profile}
      documents={documents || []}
      preferences={preferences || []}
      initialTask={task}
      formContent={formContent || []}
    />
  );
}
