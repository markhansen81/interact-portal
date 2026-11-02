import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SyncJobsButton } from "@/components/admin/sync-jobs-button";

export default async function JobsPage() {
 const supabase = await createClient();

 const { data: jobs } = await supabase
 .from("jobs")
 .select("*, work_orders(id, ta_id, status)")
 .order("start_date", { ascending: true });

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-bold text-neutral-900">Projects</h2>
 <p className="mt-1 text-sm text-neutral-500">
  Synced from Monday. Click any row to assign TAs and send work orders.
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

 {!jobs || jobs.length === 0 ? (
 <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
 <p className="text-neutral-500">No jobs synced yet.</p>
 <p className="mt-1 text-sm text-neutral-400">Click &quot;Sync from Monday&quot; to import.</p>
 </div>
 ) : (
 <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
 <table className="w-full">
 <thead>
 <tr className="border-b border-neutral-200">
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Job</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Type</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Location</th>
 <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">Dates</th>
 <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Days</th>
 <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">Staffing</th>
 <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">WOs</th>
 <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200">
 {jobs.map((job) => {
 const wos = (job.work_orders || []) as { id: string; ta_id: string; status: string }[];
 const sent = wos.filter((w) => w.status === "sent").length;
 const signed = wos.filter((w) => w.status === "signed").length;
 const total = wos.length;
 const needed = job.tas_needed || 0;
 const remaining = Math.max(0, needed - signed);

 const isFullyStaffed = remaining === 0 && needed > 0;
 const needsAttention = remaining > 0 && sent === 0 && needed > 0;
 const href = `/admin/jobs/${job.id}`;

 return (
 <tr
 key={job.id}
 className={`group cursor-pointer hover:bg-neutral-50 ${needsAttention ? "bg-yellow-50/50 hover:bg-yellow-50" : ""}`}
 >
 <td className="px-0 py-0">
 <Link href={href} className="block px-4 py-3 text-sm font-medium text-neutral-900">
 {job.title}
 </Link>
 </td>
 <td className="px-0 py-0">
 <Link href={href} className="block px-4 py-3 text-sm text-neutral-500">{job.program_type || "—"}</Link>
 </td>
 <td className="px-0 py-0">
 <Link href={href} className="block px-4 py-3 text-sm text-neutral-500">{job.school_state || "—"}</Link>
 </td>
 <td className="px-0 py-0">
 <Link href={href} className="block px-4 py-3 text-sm text-neutral-500 whitespace-nowrap">
 {job.start_date ? `${job.start_date} — ${job.end_date}` : "—"}
 </Link>
 </td>
 <td className="px-0 py-0 text-center">
 <Link href={href} className="block px-4 py-3 text-sm text-neutral-500">{job.days || "—"}</Link>
 </td>
 <td className="px-0 py-0">
 <Link href={href} className="flex items-center justify-center px-4 py-3">
 {needed > 0 ? (
 <div className="flex items-center gap-2">
 <div className="h-1.5 w-16 rounded-full bg-neutral-100">
 <div
 className={`h-1.5 rounded-full ${isFullyStaffed ? "bg-green-500" : "bg-blue-500"}`}
 style={{ width: `${Math.min(100, (signed / needed) * 100)}%` }}
 />
 </div>
 <span className={`text-xs font-medium ${isFullyStaffed ? "text-green-600" : remaining > 0 ? "text-neutral-900" : "text-neutral-500"}`}>
 {signed}/{needed}
 </span>
 </div>
 ) : (
 <span className="text-xs text-neutral-400">—</span>
 )}
 </Link>
 </td>
 <td className="px-0 py-0">
 <Link href={href} className="flex items-center justify-center px-4 py-3">
 {total > 0 ? (
 <div className="flex items-center gap-1">
 {signed > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-100 px-1.5 text-[10px] font-bold text-green-700" title="Signed">{signed}</span>}
 {sent > 0 && <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700" title="Sent, waiting">{sent}</span>}
 {wos.filter((w) => w.status === "draft").length > 0 && (
 <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[10px] font-bold text-neutral-500" title="Draft">
 {wos.filter((w) => w.status === "draft").length}
 </span>
 )}
 </div>
 ) : remaining > 0 ? (
 <span className="text-xs text-yellow-600 font-medium">{remaining} to send</span>
 ) : (
 <span className="text-xs text-neutral-400">—</span>
 )}
 </Link>
 </td>
 <td className="px-0 py-0">
 <Link href={href} className="flex items-center justify-end px-4 py-3">
 {needsAttention ? (
 <span className="inline-flex items-center gap-1 rounded-sm bg-[#E91E8C] px-3 py-1 text-xs font-semibold text-white">
 Assign WOs
 <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
 </span>
 ) : (
 <svg className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
 )}
 </Link>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}
