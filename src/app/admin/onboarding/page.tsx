import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingBoard } from "@/components/admin/onboarding-board";

export default async function AdminOnboardingPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url, pay_level, onboarding_status, training_online, training_offline, photo_url, bio, superpower, hometown_city, hometown_country, moved_to_germany, favourite_food, first_name, last_name, phone, date_of_birth, nationality, street, city, postal_code, gender, pronouns, iban, bank_name, tax_number, homestay_willing")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name");

  const { data: documents } = await supabase
    .from("documents")
    .select("ta_id, type, status");

  const { count: allPrefsCount } = await supabase
    .from("ta_program_preferences")
    .select("*", { count: "exact", head: true });

  // Count preferences per TA
  const { data: prefCounts } = await supabase
    .from("ta_program_preferences")
    .select("ta_id");

  const prefsByTA = new Map<string, number>();
  (prefCounts || []).forEach((p) => {
    prefsByTA.set(p.ta_id, (prefsByTA.get(p.ta_id) || 0) + 1);
  });

  const { data: availability } = await supabase
    .from("availability")
    .select("ta_id")
    .eq("status", "available");

  const availByTA = new Map<string, number>();
  (availability || []).forEach((a) => {
    availByTA.set(a.ta_id, (availByTA.get(a.ta_id) || 0) + 1);
  });

  // Build doc map
  const docsByTA = new Map<string, Map<string, string>>();
  (documents || []).forEach((d) => {
    if (!docsByTA.has(d.ta_id)) docsByTA.set(d.ta_id, new Map());
    docsByTA.get(d.ta_id)!.set(d.type, d.status);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Onboarding Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track what each TA still needs to complete. Send nudge reminders directly.
        </p>
      </div>
      <OnboardingBoard
        tas={tas || []}
        docsByTA={Object.fromEntries(Array.from(docsByTA.entries()).map(([k, v]) => [k, Object.fromEntries(v)]))}
        prefsByTA={Object.fromEntries(prefsByTA)}
        availByTA={Object.fromEntries(availByTA)}
      />
    </div>
  );
}
