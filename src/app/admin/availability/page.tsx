import { createClient } from "@/lib/supabase/server";

export default async function AdminAvailabilityPage() {
  const supabase = await createClient();

  // Get all active TAs
  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name");

  // Get availability for next 4 weeks
  const today = new Date();
  const fourWeeksOut = new Date(today);
  fourWeeksOut.setDate(today.getDate() + 28);

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", fourWeeksOut.toISOString().split("T")[0]);

  // Build date columns (next 28 days)
  const dates: string[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Build availability map
  const availMap = new Map<string, Map<string, string>>();
  (availability || []).forEach((a) => {
    if (!availMap.has(a.ta_id)) availMap.set(a.ta_id, new Map());
    availMap.get(a.ta_id)!.set(a.date, a.status);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          TA Availability
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Next 4 weeks. Green = available, red = unavailable, yellow = tentative.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-900">
                TA
              </th>
              {dates.map((d) => {
                const date = new Date(d);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <th
                    key={d}
                    className={`px-1 py-2 text-center text-[10px] font-medium ${
                      isWeekend ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-500"
                    }`}
                  >
                    <div>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][date.getDay()]}</div>
                    <div>{date.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(tas || []).map((ta) => {
              const taAvail = availMap.get(ta.id);
              return (
                <tr key={ta.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                    {ta.first_name && ta.last_name
                      ? `${ta.first_name} ${ta.last_name}`
                      : ta.email}
                  </td>
                  {dates.map((d) => {
                    const status = taAvail?.get(d) || "available";
                    const date = new Date(d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <td key={d} className="px-1 py-2 text-center">
                        <div
                          className={`mx-auto h-4 w-4 rounded-sm ${
                            isWeekend
                              ? "bg-zinc-100 dark:bg-zinc-800"
                              : status === "available"
                                ? "bg-green-200 dark:bg-green-900/40"
                                : status === "unavailable"
                                  ? "bg-red-200 dark:bg-red-900/40"
                                  : status === "tentative"
                                    ? "bg-yellow-200 dark:bg-yellow-900/40"
                                    : "bg-green-200 dark:bg-green-900/40"
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
