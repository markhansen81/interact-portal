"use client";

import { useState } from"react";

interface AvailabilityEntry {
 date: string;
 status: string;
}

type Status ="available"|"unavailable";

const STATUS_STYLES: Record<Status, string> = {
 available:"bg-green-100 text-green-700 hover:bg-green-200",
 unavailable:"bg-red-50 text-red-400 hover:bg-red-100",
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
 if (entry.status ==="available") s.add(entry.date);
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
 const newStatus: Status = wasAvailable ?"unavailable":"available";
 const previousDates = new Set(availableDates);

 setAvailableDates((prev) => {
 const s = new Set(prev);
 if (newStatus ==="available") s.add(dateStr);
 else s.delete(dateStr);
 return s;
 });

 try {
 const res = await fetch("/api/portal/availability", {
 method:"PATCH",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ dates: [dateStr], status: newStatus }),
 });
 if (!res.ok) throw new Error("Failed to save");
 } catch {
 // Revert on failure
 setAvailableDates(previousDates);
 }
 }

 async function setWeek(dates: Date[], status: Status) {
 const futureDates = dates.filter((d) => formatDate(d) >= todayStr);
 const dateStrs = futureDates.map(formatDate);
 const previousDates = new Set(availableDates);

 setAvailableDates((prev) => {
 const s = new Set(prev);
 for (const d of dateStrs) {
 if (status ==="available") s.add(d);
 else s.delete(d);
 }
 return s;
 });

 try {
 const res = await fetch("/api/portal/availability", {
 method:"PATCH",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ dates: dateStrs, status }),
 });
 if (!res.ok) throw new Error("Failed to save");
 } catch {
 // Revert on failure
 setAvailableDates(previousDates);
 }
 }

 return (
 <div className="overflow-hidden rounded-sm border border-neutral-200/80 bg-white">
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr className="border-b border-neutral-100">
 <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400 w-20">Week</th>
 {["Mon","Tue","Wed","Thu","Fri"].map((day) => (
 <th key={day} className="px-1 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{day}</th>
 ))}
 <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 w-28">Week</th>
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
 <tr key={wi} className="border-b border-neutral-50 last:border-0">
 <td className="px-4 py-1">
 <div className="text-xs">
 <span className="font-semibold text-neutral-500">Week {weekNum}</span>
 <br />
 <span className="text-[10px] text-neutral-400">
 {week.start.toLocaleDateString("en-GB", { day:"numeric", month:"short"})}
 </span>
 </div>
 </td>
 {week.dates.map((date) => {
 const dateStr = formatDate(date);
 const isToday = dateStr === todayStr;
 const isPast = dateStr < todayStr;
 const available = isAvailable(dateStr);
 const status: Status = available ?"available":"unavailable";

 return (
 <td key={dateStr} className="px-1 py-1">
 <button
 onClick={() => toggleDay(dateStr)}
 disabled={isPast}
 className={`flex h-11 w-full items-center justify-center rounded-sm text-xs font-medium transition-all ${
 isPast
 ?"cursor-default text-neutral-300": isToday
 ?"ring-2 ring-neutral-900 ring-offset-1"+ STATUS_STYLES[status]
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
 onClick={() => setWeek(week.dates, allAvailable ?"unavailable":"available")}
 className={`w-full rounded-sm px-2 py-2 text-[11px] font-semibold transition-all ${
 allAvailable
 ?"bg-green-100 text-green-700 hover:bg-green-200": allUnavailable
 ?"bg-neutral-100 text-neutral-500 hover:bg-neutral-200":"bg-yellow-50 text-yellow-700 hover:bg-yellow-100"}`}
 >
 {allAvailable ?"Available": allUnavailable ?"Set available": `${availCount}/5`}
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
 <div className="flex items-center gap-6 border-t border-neutral-100 px-6 py-4">
 <div className="flex items-center gap-2">
 <span className="h-3 w-3 rounded bg-green-100"/>
 <span className="text-xs text-neutral-500">Available</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="h-3 w-3 rounded bg-red-50"/>
 <span className="text-xs text-neutral-500">Unavailable</span>
 </div>
 <span className="ml-auto text-[11px] text-neutral-400">Click day to toggle, use week button to set entire week</span>
 </div>
 </div>
 );
}
