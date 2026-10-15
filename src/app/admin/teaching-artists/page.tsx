import { createClient } from "@/lib/supabase/server";
import { InviteTAButton } from "@/components/admin/invite-ta-button";
import { TASearchFilter } from "@/components/admin/ta-search-filter";

export default async function TeachingArtistsPage() {
  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "ta")
    .order("created_at", { ascending: false });

  // Get document counts per TA
  const { data: docs } = await supabase
    .from("documents")
    .select("ta_id, type, status");

  const docsByTA: Record<string, { type: string; status: string }[]> = {};
  (docs || []).forEach((d) => {
    if (!docsByTA[d.ta_id]) docsByTA[d.ta_id] = [];
    docsByTA[d.ta_id].push(d);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Teaching Artists
        </h2>
        <InviteTAButton />
      </div>

      {!tas || tas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No teaching artists yet.</p>
          <p className="mt-1 text-sm text-zinc-400">Invite your first TA to get started.</p>
        </div>
      ) : (
        <TASearchFilter tas={tas as any} docsByTA={docsByTA} />
      )}
    </div>
  );
}
