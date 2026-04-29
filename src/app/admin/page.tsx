import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { count: totalTAs } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta");

  const { count: pendingOnboarding } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta")
    .in("onboarding_status", ["pending", "in_progress"]);

  const { count: readyTAs } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "ta")
    .eq("onboarding_status", "ready");

  const stats = [
    { label: "Total Teaching Artists", value: totalTAs ?? 0 },
    { label: "Onboarding", value: pendingOnboarding ?? 0 },
    { label: "Ready to Work", value: readyTAs ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
