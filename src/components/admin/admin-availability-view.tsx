"use client";

import { useState } from "react";
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

function getWeeksForMonth(year: number, month: number) {
  const weeks: { weekNum: number; dates: Date[]; label: string }[] = [];

  // Find first Monday on or before the 1st
  const firstDay = new Date(year, month, 1);
  const startOfWeek = new Date(firstDay);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  // Generate weeks until we pass the end of the month
  const lastDay = new Date(year, month + 1, 0);
  let current = new Date(startOfWeek);

  while (current <= lastDay || current.getMonth() === month) {
    const weekDates: Date[] = [];
    for (let d = 0; d < 5; d++) {
      // Mon-Fri only
      const date = new Date(current);
      date.setDate(current.getDate() + d);
      weekDates.push(date);
    }

    const weekNum = getWeekNumber(current);
    const mon = weekDates[0];
    const fri = weekDates[4];
    const label = `${mon.getDate()} ${mon.toLocaleDateString("en-GB", { month: "short" })} — ${fri.getDate()} ${fri.toLocaleDateString("en-GB", { month: "short" })}`;

    weeks.push({ weekNum, dates: weekDates, label });

    current.setDate(current.getDate() + 7);
    if (weeks.length > 6) break; // safety
  }

  return weeks;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function AdminAvailabilityView({ tas, availability }: { tas: TA[]; availability: AvailabilityEntry[] }) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const weeks = getWeeksForMonth(viewYear, viewMonth);

  // Build availability lookup: ta_id -> date -> status
  const availMap = new Map<string, Map<string, string>>();
  for (const a of availability) {
    if (!availMap.has(a.ta_id)) availMap.set(a.ta_id, new Map());
    availMap.get(a.ta_id)!.set(a.date, a.status);
  }

  // Count available days per TA per week
  function getWeekStatus(taId: string, dates: Date[]): { available: number; total: number } {
    const taAvail = availMap.get(taId);
    let available = 0;
    const total = dates.length;
    for (const d of dates) {
      const status = taAvail?.get(formatDate(d));
      if (status === "available") available++;
    }
    return { available, total };
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 min-w-[160px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-green-200 dark:bg-green-800" />
            Available
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-zinc-200 dark:bg-zinc-700" />
            Unavailable
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-green-500" />
            Full week
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:bg-zinc-900 w-56">
                Teaching Artist
              </th>
              {weeks.map((week) => (
                <th key={week.weekNum} className="px-2 py-3 text-center">
                  <div className="text-[11px] font-semibold text-zinc-500">Week {week.weekNum}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{week.label}</div>
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

              return (
                <tr key={ta.id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3 dark:bg-zinc-900">
                    <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-3">
                      {ta.photo_url ? (
                        <img src={ta.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {initials}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
                        <p className="text-[11px] text-zinc-400">Level {ta.pay_level}{ta.category ? ` · ${ta.category}` : ""}</p>
                      </div>
                    </Link>
                  </td>
                  {weeks.map((week) => {
                    const { available, total } = getWeekStatus(ta.id, week.dates);
                    const allAvailable = available === total;
                    const noneAvailable = available === 0;

                    return (
                      <td key={week.weekNum} className="px-2 py-3 text-center">
                        {noneAvailable ? (
                          <div className="mx-auto flex h-9 w-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            <span className="text-[11px] font-medium text-zinc-400">—</span>
                          </div>
                        ) : allAvailable ? (
                          <div className="mx-auto flex h-9 w-16 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                            <span className="text-[11px] font-bold text-green-700 dark:text-green-400">5/5</span>
                          </div>
                        ) : (
                          <div className="mx-auto flex h-9 w-16 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/10">
                            <div className="flex gap-0.5">
                              {week.dates.map((d) => {
                                const dateStr = formatDate(d);
                                const status = availMap.get(ta.id)?.get(dateStr);
                                const isAvail = status === "available";
                                return (
                                  <div
                                    key={dateStr}
                                    className={`h-5 w-2 rounded-sm ${
                                      isAvail
                                        ? "bg-green-400 dark:bg-green-500"
                                        : "bg-zinc-200 dark:bg-zinc-700"
                                    }`}
                                    title={`${["Mon", "Tue", "Wed", "Thu", "Fri"][d.getDay() - 1]} ${d.getDate()} — ${isAvail ? "Available" : "Unavailable"}`}
                                  />
                                );
                              })}
                            </div>
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
