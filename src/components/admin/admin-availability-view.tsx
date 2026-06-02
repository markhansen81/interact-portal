"use client";

import Link from "next/link";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
  category: string | null;
  pay_level: number;
}

interface AvailabilityEntry {
  ta_id: string;
  date: string;
  status: string;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateWeeks(numWeeks: number) {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const weeks: { weekNum: number; dates: Date[]; month: number; year: number; isFirstOfMonth: boolean }[] = [];

  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + w * 7);
    const dates: Date[] = [];
    for (let d = 0; d < 5; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      dates.push(date);
    }

    const month = weekStart.getMonth();
    const year = weekStart.getFullYear();
    const isFirstOfMonth = w === 0 || weeks[weeks.length - 1].month !== month;

    weeks.push({ weekNum: getWeekNumber(weekStart), dates, month, year, isFirstOfMonth });
  }

  return weeks;
}

export function AdminAvailabilityView({
  tas,
  availability,
  lastUpdates,
}: {
  tas: TA[];
  availability: AvailabilityEntry[];
  lastUpdates: Record<string, string>;
}) {
  const today = new Date();
  const weeks = generateWeeks(26); // 6 months

  // Build availability lookup
  const availMap = new Map<string, Map<string, string>>();
  for (const a of availability) {
    if (!availMap.has(a.ta_id)) availMap.set(a.ta_id, new Map());
    availMap.get(a.ta_id)!.set(a.date, a.status);
  }

  // Group weeks by month for header spans
  const monthSpans: { label: string; colSpan: number }[] = [];
  let currentMonth = -1;
  for (const week of weeks) {
    if (week.month !== currentMonth) {
      monthSpans.push({ label: `${MONTH_NAMES[week.month]} ${week.year}`, colSpan: 1 });
      currentMonth = week.month;
    } else {
      monthSpans[monthSpans.length - 1].colSpan++;
    }
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-5 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-400" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-zinc-200 dark:bg-zinc-700" />
          Unavailable
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-3 w-8 items-center justify-center rounded bg-green-100 text-[8px] font-bold text-green-700">5/5</div>
          Full week
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="border-collapse">
          {/* Month headers */}
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="sticky left-0 z-20 bg-white dark:bg-zinc-900 w-60 min-w-[240px]" rowSpan={2}>
                <div className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Teaching Artist
                </div>
              </th>
              {monthSpans.map((span, i) => (
                <th
                  key={i}
                  colSpan={span.colSpan}
                  className="border-l border-zinc-100 px-2 pt-3 pb-1 text-center text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  {span.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              {weeks.map((week) => (
                <th
                  key={week.weekNum + "-" + week.dates[0].getTime()}
                  className={`px-1 pb-2 pt-1 text-center min-w-[72px] ${week.isFirstOfMonth ? "border-l border-zinc-100 dark:border-zinc-800" : ""}`}
                >
                  <div className="text-[10px] font-medium text-zinc-500">W{week.weekNum}</div>
                  <div className="text-[9px] text-zinc-400">
                    {week.dates[0].getDate()}–{week.dates[4].getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {tas.map((ta) => {
              const name = ta.first_name && ta.last_name
                ? `${ta.first_name} ${ta.last_name}`
                : ta.email;
              const initials = [ta.first_name?.[0], ta.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
              const lastDate = lastUpdates[ta.id];
              const daysSince = lastDate ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86400000) : null;
              const isStale = daysSince !== null && daysSince > 60;

              return (
                <tr key={ta.id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3 dark:bg-zinc-900">
                    <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-3">
                      {ta.photo_url ? (
                        <img src={ta.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
                        <p className={`text-[11px] font-medium ${
                          daysSince === null ? "text-red-500" : isStale ? "text-amber-600" : "text-green-600 dark:text-green-400"
                        }`}>
                          {daysSince === null
                            ? "Never updated"
                            : `Updated ${new Date(lastDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                          {isStale ? " — stale" : ""}
                        </p>
                      </div>
                    </Link>
                  </td>
                  {weeks.map((week) => {
                    const taAvail = availMap.get(ta.id);
                    let available = 0;
                    for (const d of week.dates) {
                      if (taAvail?.get(formatDate(d)) === "available") available++;
                    }
                    const total = week.dates.length;
                    const allAvailable = available === total;
                    const noneAvailable = available === 0;

                    return (
                      <td
                        key={week.weekNum + "-" + week.dates[0].getTime()}
                        className={`px-1 py-2 text-center ${week.isFirstOfMonth ? "border-l border-zinc-100 dark:border-zinc-800" : ""}`}
                      >
                        {noneAvailable ? (
                          <div className="mx-auto flex h-8 w-14 items-center justify-center rounded-md bg-zinc-50 dark:bg-zinc-800/50">
                            <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>
                          </div>
                        ) : allAvailable ? (
                          <div className="mx-auto flex h-8 w-14 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-400">5/5</span>
                          </div>
                        ) : (
                          <div className="mx-auto flex h-8 w-14 items-center justify-center gap-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/30">
                            {week.dates.map((d) => {
                              const isAvail = taAvail?.get(formatDate(d)) === "available";
                              return (
                                <div
                                  key={formatDate(d)}
                                  className={`h-5 w-1.5 rounded-sm ${isAvail ? "bg-green-400" : "bg-zinc-200 dark:bg-zinc-700"}`}
                                  title={`${["Mon", "Tue", "Wed", "Thu", "Fri"][d.getDay() - 1]} ${d.getDate()} — ${isAvail ? "Available" : "Unavailable"}`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {tas.length === 0 && (
              <tr>
                <td colSpan={weeks.length + 1} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No active teaching artists
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
