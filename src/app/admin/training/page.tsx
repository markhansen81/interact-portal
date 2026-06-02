import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrainingManagement } from "@/components/admin/training-management";

export default async function TrainingPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url, training_online, training_offline, onboarding_status, pay_level, pd_workshop_credits")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Training Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track online and offline training completion for all teaching artists.
        </p>
      </div>
      <TrainingManagement tas={tas || []} />
    </div>
  );
}
