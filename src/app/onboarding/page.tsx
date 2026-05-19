import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/portal/onboarding-wizard";

export default async function OnboardingPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  // If already onboarded, go to portal
  if (profile.onboarding_status === "ready") {
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

  return (
    <OnboardingWizard
      profile={profile}
      documents={documents || []}
      preferences={preferences || []}
    />
  );
}
