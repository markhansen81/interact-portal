import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ServicesTable } from "@/components/admin/services-table";
import { PayScalesEditor } from "@/components/admin/pay-scales-editor";

export default async function ServicesPage() {
 const profile = await requireAuth(["admin"]);
 if (!profile) redirect("/auth/admin");

 const supabase = await createClient();

 const { data: services } = await supabase
 .from("services")
 .select("*")
 .order("sort_order", { ascending: true });

 const { data: payScales } = await supabase
 .from("pay_scales")
 .select("*")
 .order("scale_type")
 .order("level");

 const { data: travelStipends } = await supabase
 .from("travel_stipends")
 .select("*")
 .order("min_hours");

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
 Services & Rates
 </h1>
 <p className="mt-1 text-sm text-neutral-500">
 Manage billable add-ons, pay scales, and travel stipends. Changes take effect on new invoices only.
 </p>
 </div>

 <ServicesTable services={services || []} />

 {/* Pay Scales */}
 <div>
 <h2 className="text-lg font-semibold text-neutral-900 mb-3">Pay Scales</h2>
 <p className="mb-4 text-sm text-neutral-500">Edit rates and labels inline. Changes apply to new work orders immediately.</p>
 <PayScalesEditor payScales={payScales || []} />
 </div>

 {/* Travel Stipends */}
 <div>
 <h2 className="text-lg font-semibold text-neutral-900 mb-3">Travel Stipends</h2>
 <div className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
 <table className="w-full">
 <thead>
 <tr className="border-b border-neutral-100">
 <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Travel Time</th>
 <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Amount</th>
 <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Notes</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-50">
 {(travelStipends || []).map((ts) => (
 <tr key={ts.id} className="hover:bg-neutral-50/50">
 <td className="px-5 py-3 text-sm text-neutral-900">
 {ts.min_hours}h{ts.max_hours ? ` — ${ts.max_hours}h` : "+"}
 </td>
 <td className="px-5 py-3 text-sm font-medium text-neutral-900">€{Number(ts.amount).toFixed(2)}</td>
 <td className="px-5 py-3 text-sm text-neutral-500">{ts.notes || "—"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
