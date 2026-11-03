import { createClient } from "@/lib/supabase/server";
import { InviteTAButton } from "@/components/admin/invite-ta-button";
import { TASearchFilter } from "@/components/admin/ta-search-filter";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function TeachingArtistsPage() {
  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "ta")
    .order("created_at", { ascending: false });

  const { data: docs } = await supabase
    .from("documents")
    .select("ta_id, type, status, expiry_date");

  const { data: prefCounts } = await supabase
    .from("ta_program_preferences")
    .select("ta_id");

  const { data: availability } = await supabase
    .from("availability")
    .select("ta_id")
    .eq("status", "available");

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("ta_id, project_name, school, start_date, end_date, status, program_type")
    .order("start_date", { ascending: false });

  const docsByTA: Record<string, { type: string; status: string; expiry_date: string | null }[]> = {};
  (docs || []).forEach((d) => {
    if (!docsByTA[d.ta_id]) docsByTA[d.ta_id] = [];
    docsByTA[d.ta_id].push(d);
  });

  const prefsByTA: Record<string, number> = {};
  (prefCounts || []).forEach((p) => {
    prefsByTA[p.ta_id] = (prefsByTA[p.ta_id] || 0) + 1;
  });

  const availByTA: Record<string, number> = {};
  (availability || []).forEach((a) => {
    availByTA[a.ta_id] = (availByTA[a.ta_id] || 0) + 1;
  });

  const workOrdersByTA: Record<string, { project_name: string | null; school: string | null; start_date: string | null; end_date: string | null; status: string; program_type: string | null }[]> = {};
  (workOrders || []).forEach((wo) => {
    if (!workOrdersByTA[wo.ta_id]) workOrdersByTA[wo.ta_id] = [];
    workOrdersByTA[wo.ta_id].push(wo);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teaching Artists"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/teaching-artists/unmatched"
              className="text-sm text-neutral-500 hover:text-neutral-700 underline"
            >
              Invoice History (Unmatched)
            </Link>
            <InviteTAButton />
          </div>
        }
      />

      {!tas || tas.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
          <p className="text-neutral-500">No teaching artists yet.</p>
          <p className="mt-1 text-sm text-neutral-400">Invite your first TA to get started.</p>
        </div>
      ) : (
        <TASearchFilter
          tas={tas as any}
          docsByTA={docsByTA as any}
          prefsByTA={prefsByTA}
          availByTA={availByTA}
          workOrdersByTA={workOrdersByTA}
        />
      )}
    </div>
  );
}
