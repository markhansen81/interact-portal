"use client";

import { useState, useMemo } from "react";
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

interface Week {
  weekNum: number;
  dates: Date[];
  month: number;
  year: number;
  isFirstOfMonth: boolean;
}

function generateWeeks(numWeeks: number): Week[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const weeks: Week[] = [];
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
  const weeks = generateWeeks(52);

  const [search, setSearch] = useState("");
  const [filterWeek, setFilterWeek] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [minDays, setMinDays] = useState<number>(0);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Build availability lookup
  const availMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of availability) {
      if (a.status === "available") {
        if (!m.has(a.ta_id)) m.set(a.ta_id, new Set());
        m.get(a.ta_id)!.add(a.date);
      }
    }
    return m;
  }, [availability]);

  function isAvailable(taId: string, date: string): boolean {
    return availMap.get(taId)?.has(date) || false;
  }

  function weekAvailCount(taId: string, week: Week): number {
    return week.dates.filter((d) => isAvailable(taId, formatDate(d))).length;
  }

  // Filter TAs
  const filteredTAs = useMemo(() => {
    let result = tas;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((ta) => {
        const name = `${ta.first_name || ""} ${ta.last_name || ""} ${ta.email}`.toLowerCase();
        return name.includes(q);
      });
    }

    // Filter by specific day
    if (filterDay) {
      result = result.filter((ta) => isAvailable(ta.id, filterDay));
    }

    // Filter by week (all 5 days or at least minDays)
    if (filterWeek !== null) {
      const week = weeks.find((w) => w.weekNum === filterWeek && w.dates[0].getTime() > today.getTime() - 7 * 86400000);
      if (week) {
        result = result.filter((ta) => weekAvailCount(ta.id, week) >= (minDays || 1));
      }
    }

    // Show only TAs with any availability in visible range
    if (showOnlyAvailable) {
      result = result.filter((ta) => (availMap.get(ta.id)?.size || 0) > 0);
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tas, search, filterDay, filterWeek, minDays, showOnlyAvailable, availMap]);

  // Month spans for header
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

  // Quick week options for filter
  const nextWeeks = weeks.slice(0, 8);

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
          />
        </div>

        {/* Filter by week */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Available in week</label>
          <select
            value={filterWeek ?? ""}
            onChange={(e) => setFilterWeek(e.target.value ? Number(e.target.value) : null)}
            className="block rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
          >
            <option value="">All weeks</option>
            {nextWeeks.map((w) => (
              <option key={w.weekNum + "-" + w.dates[0].getTime()} value={w.weekNum}>
                W{w.weekNum} ({w.dates[0].getDate()} {MONTH_NAMES[w.dates[0].getMonth()]} – {w.dates[4].getDate()} {MONTH_NAMES[w.dates[4].getMonth()]})
              </option>
            ))}
          </select>
        </div>

        {/* Min days in week */}
        {filterWeek !== null && (
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Min days</label>
            <select
              value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))}
              className="block rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}+ days</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter by specific date */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Available on date</label>
          <input
            type="date"
            value={filterDay || ""}
            onChange={(e) => setFilterDay(e.target.value || null)}
            min={formatDate(today)}
            className="block rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
          />
        </div>

        {/* Toggle: only with availability */}
        <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2 text-sm dark:border-zinc-700">
          <input
            type="checkbox"
            checked={showOnlyAvailable}
            onChange={(e) => setShowOnlyAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Has availability</span>
        </label>

        {/* Clear */}
        {(search || filterWeek !== null || filterDay || showOnlyAvailable) && (
          <button
            onClick={() => { setSearch(""); setFilterWeek(null); setFilterDay(null); setMinDays(0); setShowOnlyAvailable(false); }}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {filteredTAs.length} of {tas.length} TAs
          {filterDay && ` available on ${new Date(filterDay).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`}
          {filterWeek !== null && ` available in week ${filterWeek}`}
        </p>
        <div className="flex items-center gap-5 text-xs text-zinc-500">
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
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="border-collapse">
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
              {weeks.map((week) => {
                const isFiltered = filterWeek === week.weekNum;
                return (
                  <th
                    key={week.weekNum + "-" + week.dates[0].getTime()}
                    className={`px-1 pb-2 pt-1 text-center min-w-[72px] cursor-pointer transition-colors ${
                      week.isFirstOfMonth ? "border-l border-zinc-100 dark:border-zinc-800" : ""
                    } ${isFiltered ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                    onClick={() => setFilterWeek(isFiltered ? null : week.weekNum)}
                    title={`Click to filter by week ${week.weekNum}`}
                  >
                    <div className={`text-[10px] font-medium ${isFiltered ? "text-blue-600" : "text-zinc-500"}`}>W{week.weekNum}</div>
                    <div className="text-[9px] text-zinc-400">
                      {week.dates[0].getDate()}–{week.dates[4].getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredTAs.map((ta) => {
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
                    const avail = weekAvailCount(ta.id, week);
                    const total = week.dates.length;
                    const allAvailable = avail === total;
                    const noneAvailable = avail === 0;
                    const isFilteredWeek = filterWeek === week.weekNum;

                    return (
                      <td
                        key={week.weekNum + "-" + week.dates[0].getTime()}
                        className={`px-1 py-2 text-center ${week.isFirstOfMonth ? "border-l border-zinc-100 dark:border-zinc-800" : ""} ${isFilteredWeek ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
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
                              const dateStr = formatDate(d);
                              const avl = isAvailable(ta.id, dateStr);
                              const isFilteredDay = filterDay === dateStr;
                              return (
                                <div
                                  key={dateStr}
                                  className={`h-5 w-1.5 rounded-sm ${
                                    avl
                                      ? isFilteredDay ? "bg-blue-500" : "bg-green-400"
                                      : isFilteredDay ? "bg-red-300" : "bg-zinc-200 dark:bg-zinc-700"
                                  }`}
                                  title={`${["Mon", "Tue", "Wed", "Thu", "Fri"][d.getDay() - 1]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} — ${avl ? "Available" : "Unavailable"}`}
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
            {filteredTAs.length === 0 && (
              <tr>
                <td colSpan={weeks.length + 1} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No TAs match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
