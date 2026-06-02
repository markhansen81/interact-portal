"use client";

import { useState } from "react";

interface AvailabilityEntry {
  date: string;
  status: string;
}

type Status = "available" | "unavailable";

const STATUS_STYLES: Record<Status, string> = {
  available: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
  unavailable: "bg-red-50 text-red-400 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-500",
};

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

function generateWeeks(numWeeks: number) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday

  const weeks: { start: Date; dates: Date[] }[] = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + w * 7);
    const dates: Date[] = [];
    // Mon-Fri only (5 days)
    for (let d = 0; d < 5; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      dates.push(date);
    }
    weeks.push({ start: weekStart, dates });
  }
  return weeks;
}

export function AvailabilityCalendar({ initialData }: { initialData: AvailabilityEntry[] }) {
  // Default: everything is unavailable unless explicitly set to available
  const [availableDates, setAvailableDates] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const entry of initialData) {
      if (entry.status === "available") s.add(entry.date);
    }
    return s;
  });

  const today = new Date();
  const todayStr = formatDate(today);
  const weeks = generateWeeks(52);

  function isAvailable(date: string): boolean {
    return availableDates.has(date);
  }

  async function toggleDay(dateStr: string) {
    const wasAvailable = isAvailable(dateStr);
    const newStatus: Status = wasAvailable ? "unavailable" : "available";

    setAvailableDates((prev) => {
      const s = new Set(prev);
      if (newStatus === "available") s.add(dateStr);
      else s.delete(dateStr);
      return s;
    });

    await fetch("/api/portal/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dates: [dateStr], status: newStatus }),
    });
  }

  async function setWeek(dates: Date[], status: Status) {
    const futureDates = dates.filter((d) => formatDate(d) >= todayStr);
    const dateStrs = futureDates.map(formatDate);

    setAvailableDates((prev) => {
      const s = new Set(prev);
      for (const d of dateStrs) {
        if (status === "available") s.add(d);
        else s.delete(d);
      }
      return s;
    });

    await fetch("/api/portal/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dates: dateStrs, status }),
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400 w-20">Week</th>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                <th key={day} className="px-1 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{day}</th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400 w-28">Week</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => {
              const weekNum = getWeekNumber(week.start);
              const futureDates = week.dates.filter((d) => formatDate(d) >= todayStr);
              const availCount = futureDates.filter((d) => isAvailable(formatDate(d))).length;
              const allAvailable = futureDates.length > 0 && availCount === futureDates.length;
              const allUnavailable = availCount === 0;

              return (
                <tr key={wi} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                  <td className="px-4 py-1">
                    <div className="text-xs">
                      <span className="font-semibold text-zinc-500">Week {weekNum}</span>
                      <br />
                      <span className="text-[10px] text-zinc-400">
                        {week.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </td>
                  {week.dates.map((date) => {
                    const dateStr = formatDate(date);
                    const isToday = dateStr === todayStr;
                    const isPast = dateStr < todayStr;
                    const available = isAvailable(dateStr);
                    const status: Status = available ? "available" : "unavailable";

                    return (
                      <td key={dateStr} className="px-1 py-1">
                        <button
                          onClick={() => toggleDay(dateStr)}
                          disabled={isPast}
                          className={`flex h-11 w-full items-center justify-center rounded-lg text-xs font-medium transition-all ${
                            isPast
                              ? "cursor-default text-zinc-300 dark:text-zinc-700"
                              : isToday
                                ? "ring-2 ring-zinc-900 ring-offset-1 dark:ring-zinc-100 " + STATUS_STYLES[status]
                                : STATUS_STYLES[status]
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1">
                    {futureDates.length > 0 && (
                      <button
                        onClick={() => setWeek(week.dates, allAvailable ? "unavailable" : "available")}
                        className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold transition-all ${
                          allAvailable
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                            : allUnavailable
                              ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                              : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400"
                        }`}
                      >
                        {allAvailable ? "Available" : allUnavailable ? "Set available" : `${availCount}/5`}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/30" />
          <span className="text-xs text-zinc-500">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-red-50 dark:bg-red-900/20" />
          <span className="text-xs text-zinc-500">Unavailable</span>
        </div>
        <span className="ml-auto text-[11px] text-zinc-400">Click day to toggle, use week button to set entire week</span>
      </div>
    </div>
  );
}
