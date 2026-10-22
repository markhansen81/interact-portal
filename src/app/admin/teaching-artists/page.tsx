import { createClient } from "@/lib/supabase/server";
import { InviteTAButton } from "@/components/admin/invite-ta-button";
import { TASearchFilter } from "@/components/admin/ta-search-filter";
import { PageHeader } from "@/components/ui";

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
      <PageHeader title="Teaching Artists" action={<InviteTAButton />} />

      {!tas || tas.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
          <p className="text-neutral-500">No teaching artists yet.</p>
          <p className="mt-1 text-sm text-neutral-400">Invite your first TA to get started.</p>
        </div>
      ) : (
        <TASearchFilter tas={tas as any} docsByTA={docsByTA} />
      )}
    </div>
  );
}
