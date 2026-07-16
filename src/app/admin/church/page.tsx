import { createClient } from "@/lib/supabase/server";
import { ChurchView } from "@/components/admin/church-view";

export default async function ChurchPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("church_items")
    .select("*, church_ta_slots(*, profiles:ta_id(id, first_name, last_name, email, photo_url, city, pay_level))")
    .order("kw", { ascending: true })
    .order("name", { ascending: true });

  // Group by year + KW
  const grouped: Record<string, NonNullable<typeof items>> = {};
  for (const item of items || []) {
    const key = item.kw && item.year
      ? `KW ${item.kw} // ${item.year}`
      : item.deal_stage === "Won" || item.source === "project"
        ? "Confirmed (no date)"
        : "Pipeline";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  // Get available TAs for the staffing modal
  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, city, country, pay_level, camp_level, is_active, homestay_willing, exp_grades_1_4, exp_grades_5_7, exp_grades_8_plus, photo_url")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("last_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Church</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Project overview by calendar week. Data synced from Monday CRM.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">Project</span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Opportunity</span>
        </div>
      </div>

      <ChurchView groups={grouped} availableTAs={tas || []} />
    </div>
  );
}
