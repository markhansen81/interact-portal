import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function AvailabilityPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  // Generate next 12 weeks of dates
  const weeks: { start: Date; dates: Date[] }[] = [];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

  for (let w = 0; w < 12; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + w * 7);
    const dates: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      dates.push(date);
    }
    weeks.push({ start: weekStart, dates });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Availability
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Keep your availability updated to receive job offers. Click a date to toggle.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-8 gap-1 text-center text-xs font-medium text-zinc-500">
          <div>Week</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>
        {weeks.map((week, i) => (
          <div key={i} className="mt-1 grid grid-cols-8 gap-1">
            <div className="flex items-center justify-center text-xs text-zinc-400">
              KW {getWeekNumber(week.start)}
            </div>
            {week.dates.map((date, j) => {
              const isToday = date.toDateString() === today.toDateString();
              const isPast = date < today;
              return (
                <button
                  key={j}
                  disabled={isPast}
                  className={`flex h-10 items-center justify-center rounded text-xs transition-colors ${
                    isPast
                      ? "text-zinc-300 dark:text-zinc-700"
                      : isToday
                        ? "bg-zinc-900 font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
        <div className="mt-4 flex gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/30" />
            Available
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" />
            Unavailable
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-yellow-100 dark:bg-yellow-900/30" />
            Tentative
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
