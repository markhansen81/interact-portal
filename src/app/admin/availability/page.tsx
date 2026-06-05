import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminAvailabilityView } from "@/components/admin/admin-availability-view";

export default async function AdminAvailabilityPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  // Get all active TAs
  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url, category, pay_level, updated_at")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name");

  // Get all availability for next 6 months
  const today = new Date();
  const sixMonths = new Date(today);
  sixMonths.setMonth(today.getMonth() + 12);

  const { data: availability } = await supabase
    .from("availability")
    .select("ta_id, date, status")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", sixMonths.toISOString().split("T")[0]);

  // Get last availability update per TA (most recent date they set)
  const { data: lastUpdates } = await supabase
    .from("availability")
    .select("ta_id, date")
    .order("date", { ascending: false });

  const lastUpdateMap = new Map<string, string>();
  for (const entry of lastUpdates || []) {
    if (!lastUpdateMap.has(entry.ta_id)) {
      lastUpdateMap.set(entry.ta_id, entry.date);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          TA Availability
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of teaching artist availability by week.
        </p>
      </div>
      <AdminAvailabilityView
        tas={tas || []}
        availability={availability || []}
        lastUpdates={Object.fromEntries(lastUpdateMap)}
      />
    </div>
  );
}
