"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface WorkOrder {
  id: string;
  project_name: string;
  school: string;
  start_date: string;
  end_date: string;
  status: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = startOffset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  const grid: (Date | null)[][] = [];
  let dayCounter = 1;

  for (let r = 0; r < rows; r++) {
    const row: (Date | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startOffset || dayCounter > daysInMonth) {
        row.push(null);
      } else {
        row.push(new Date(year, month, dayCounter));
        dayCounter++;
      }
    }
    grid.push(row);
  }
  return grid;
}

function getWorkOrdersForDay(date: Date, workOrders: WorkOrder[]): WorkOrder[] {
  const d = date.getTime();
  return workOrders.filter((wo) => {
    const start = new Date(wo.start_date + "T00:00:00").getTime();
    const end = new Date(wo.end_date + "T00:00:00").getTime();
    return d >= start && d <= end;
  });
}

export function TACalendar({ workOrders }: { workOrders: WorkOrder[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start on the month of the next upcoming project, or today
  const initialMonth = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const next = workOrders
      .filter((wo) => new Date(wo.end_date + "T00:00:00") >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
    if (next) {
      const d = new Date(next.start_date + "T00:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [workOrders]);

  const [year, setYear] = useState(initialMonth.year);
  const [month, setMonth] = useState(initialMonth.month);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return workOrders
      .filter((wo) => new Date(wo.end_date + "T00:00:00") >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);
  }, [workOrders]);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Calendar</h2>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {MONTH_NAMES[month]} {year}
              </h3>
            </div>
            <button
              onClick={goToday}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Today
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-zinc-500">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 divide-x divide-zinc-100 dark:divide-zinc-800">
                {row.map((date, ci) => {
                  if (!date) {
                    return <div key={ci} className="min-h-[100px] bg-zinc-50/50 dark:bg-zinc-900/50" />;
                  }

                  const isToday = isSameDay(date, today);
                  const dayOrders = getWorkOrdersForDay(date, workOrders);

                  return (
                    <div
                      key={ci}
                      className={`min-h-[100px] p-1.5 ${isToday ? "bg-blue-50/60 dark:bg-blue-950/20" : ""}`}
                    >
                      <span
                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="space-y-0.5">
                        {dayOrders.map((wo) => (
                          <Link
                            key={wo.id}
                            href={`/portal/work-orders/${wo.id}`}
                            className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 ${
                              wo.status === "signed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                            }`}
                          >
                            {wo.project_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[280px] shrink-0 space-y-6">
          {/* Upcoming */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Upcoming</h4>
            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-500">No upcoming work orders.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((wo) => (
                  <Link
                    key={wo.id}
                    href={`/portal/work-orders/${wo.id}`}
                    className="block rounded-lg border border-zinc-100 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{wo.project_name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{wo.school}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        {formatDateShort(wo.start_date)} — {formatDateShort(wo.end_date)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          wo.status === "signed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {wo.status === "signed" ? "Signed" : "Unsigned"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team Meetings placeholder */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h4 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Team Meetings</h4>
            <p className="text-sm text-zinc-500">No upcoming meetings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
