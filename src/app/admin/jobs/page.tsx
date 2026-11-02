import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SyncJobsButton } from "@/components/admin/sync-jobs-button";
import { JobsTable } from "@/components/admin/jobs-table";

function getISOWeek(dateStr: string): number {
 const d = new Date(dateStr);
 const dayOfWeek = d.getUTCDay() || 7;
 d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
 const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
 return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOYear(dateStr: string): number {
 const d = new Date(dateStr);
 const dayOfWeek = d.getUTCDay() || 7;
 d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
 return d.getUTCFullYear();
}

function getWeekKey(dateStr: string): string {
 return `${getISOYear(dateStr)}-W${String(getISOWeek(dateStr)).padStart(2, "0")}`;
}

function getMondayOfCurrentWeek(): Date {
 const now = new Date();
 const day = now.getUTCDay() || 7;
 const monday = new Date(now);
 monday.setUTCDate(now.getUTCDate() - day + 1);
 monday.setUTCHours(0, 0, 0, 0);
 return monday;
}

export default async function JobsPage() {
 const supabase = await createClient();

 const { data: rawJobs } = await supabase
 .from("jobs")
 .select("*, work_orders(id, ta_id, status, profiles!work_orders_ta_id_fkey(full_name))")
 .order("start_date", { ascending: true });

 const jobs = rawJobs || [];
 const thisMonday = getMondayOfCurrentWeek();

 const sorted = [...jobs].sort((a, b) => {
 const aHasDate = !!a.start_date;
 const bHasDate = !!b.start_date;
 if (!aHasDate && !bHasDate) return 0;
 if (!aHasDate) return 1;
 if (!bHasDate) return -1;
 const aDate = new Date(a.start_date);
 const bDate = new Date(b.start_date);
 const aFuture = aDate >= thisMonday;
 const bFuture = bDate >= thisMonday;
 if (aFuture && bFuture) return aDate.getTime() - bDate.getTime();
 if (!aFuture && !bFuture) return bDate.getTime() - aDate.getTime();
 return aFuture ? -1 : 1;
 });

 const weekColorMap = new Map<string, number>();
 let colorToggle = 0;
 for (const job of sorted) {
 if (!job.start_date) continue;
 const key = getWeekKey(job.start_date);
 if (!weekColorMap.has(key)) {
 weekColorMap.set(key, colorToggle % 2);
 colorToggle++;
 }
 }

 const tableJobs = sorted.map((job) => {
 const wos = (job.work_orders || []) as { id: string; ta_id: string; status: string; profiles: { full_name: string | null } | null }[];
 const sent = wos.filter((w) => w.status === "sent").length;
 const signed = wos.filter((w) => w.status === "signed").length;
 const needed = job.tas_needed || 0;
 const remaining = Math.max(0, needed - signed);
 const weekKey = job.start_date ? getWeekKey(job.start_date) : null;
 return {
 id: job.id,
 title: job.title,
 program_type: job.program_type ?? null,
 school_state: job.school_state ?? null,
 start_date: job.start_date ?? null,
 end_date: job.end_date ?? null,
 days: job.days ?? null,
 tas_needed: needed,
 work_orders: wos,
 weekNum: job.start_date ? getISOWeek(job.start_date) : null,
 weekColor: weekKey !== null ? (weekColorMap.get(weekKey) ?? 0) : 0,
 needsAttention: remaining > 0 && sent === 0 && needed > 0,
 isFullyStaffed: remaining === 0 && needed > 0,
 signed,
 sent,
 remaining,
 needed,
 total: wos.length,
 };
 });

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-bold text-neutral-900">Projects</h2>
 <p className="mt-1 text-sm text-neutral-500">
  Synced from Monday. Click a row to expand and see assigned TAs.
 </p>
 </div>
 <div className="flex gap-3">
 <SyncJobsButton />
 <Link
 href="https://interactenglish-squad.monday.com/boards/7871804260"
 target="_blank"
 className="rounded-sm border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
 >
 Monday Board
 </Link>
 </div>
 </div>

 {tableJobs.length === 0 ? (
 <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
 <p className="text-neutral-500">No jobs synced yet.</p>
 <p className="mt-1 text-sm text-neutral-400">Click &quot;Sync from Monday&quot; to import.</p>
 </div>
 ) : (
 <JobsTable jobs={tableJobs} />
 )}
 </div>
 );
}
