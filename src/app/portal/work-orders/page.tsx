import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TAWorkOrdersPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*")
    .eq("ta_id", profile.id)
    .order("created_at", { ascending: false });

  const statusStyles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    sent: "bg-yellow-100 text-yellow-700",
    signed: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        My Work Orders
      </h2>

      {!workOrders || workOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No work orders yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Work orders from InterACT will appear here for you to review and sign.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                    {wo.project_name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {wo.program_type} — {wo.days} day{wo.days > 1 ? "s" : ""} — {wo.start_date} to {wo.end_date}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {wo.school}, {wo.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[wo.status] || ""}`}>
                    {wo.status}
                  </span>
                  {wo.status === "sent" && (
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                        Sign
                      </button>
                      <button className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {wo.total && (
                <p className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  €{Number(wo.total).toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
