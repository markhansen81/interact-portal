import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/portal/profile-editor";
import { PageHeader } from "@/components/ui";

export default async function ProfilePage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

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
    <div className="space-y-6">
      <PageHeader title="My Profile" />
      <ProfileEditor
        profile={profile}
        documents={documents || []}
        preferences={preferences || []}
      />
    </div>
  );
}
