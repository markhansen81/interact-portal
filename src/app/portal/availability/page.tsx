import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityCalendar } from "@/components/portal/availability-calendar";

export default async function AvailabilityPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: availability } = await supabase
    .from("availability")
    .select("date, status")
    .eq("ta_id", profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Availability
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Keep your availability updated to receive job offers. Click a day to toggle, or click the week number to toggle the whole week.
        </p>
      </div>
      <AvailabilityCalendar initialData={availability || []} />
    </div>
  );
}
