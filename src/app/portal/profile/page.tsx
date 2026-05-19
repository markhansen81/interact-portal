import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/portal/profile-editor";

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
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Profile</h2>
      <ProfileEditor
        profile={profile}
        documents={documents || []}
        preferences={preferences || []}
      />
    </div>
  );
}
