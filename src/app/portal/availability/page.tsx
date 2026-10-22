import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityCalendar } from "@/components/portal/availability-calendar";
import { PageHeader } from "@/components/ui";

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
      <PageHeader
        title="Availability"
        description="Keep your availability updated to receive job offers. Click a day to toggle, or click the week number to toggle the whole week."
      />
      <AvailabilityCalendar initialData={availability || []} />
    </div>
  );
}
