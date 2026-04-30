import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { InviteTAButton } from "@/components/admin/invite-ta-button";
import { DeleteTAButton } from "@/components/admin/delete-ta-button";
import { TrainingToggle } from "@/components/admin/training-toggle";

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

  const docsByTA = new Map<string, { type: string; status: string }[]>();
  (docs || []).forEach((d) => {
    if (!docsByTA.has(d.ta_id)) docsByTA.set(d.ta_id, []);
    docsByTA.get(d.ta_id)!.push(d);
  });

  const REQUIRED_DOCS = ["right_to_work", "police_check", "measles"];

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
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Onboarding</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Missing</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Online</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Offline</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Projects</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tas.map((ta) => {
                const sectionsComplete = (ta.onboarding_sections_complete || {}) as Record<string, boolean>;
                const completedSections = Object.values(sectionsComplete).filter(Boolean).length;
                const progress = Math.round((completedSections / 7) * 100);

                // Calculate what's missing
                const taDocs = docsByTA.get(ta.id) || [];
                const uploadedTypes = new Set(taDocs.filter((d) => d.status !== "not_uploaded").map((d) => d.type));
                const missing: string[] = [];

                if (!ta.first_name) missing.push("Name");
                if (!ta.address) missing.push("Address");
                if (!ta.phone) missing.push("Phone");
                REQUIRED_DOCS.forEach((docType) => {
                  if (!uploadedTypes.has(docType)) {
                    const labels: Record<string, string> = {
                      right_to_work: "Visa/Passport",
                      police_check: "Police Check",
                      measles: "Measles",
                    };
                    missing.push(labels[docType] || docType);
                  }
                });
                if (!ta.training_online) missing.push("Online Training");
                if (!ta.training_offline) missing.push("Offline Training");
                if (!(ta as Record<string, unknown>).iban) missing.push("IBAN");
                if (!(ta as Record<string, unknown>).tax_number) missing.push("Tax #");

                return (
                  <tr key={ta.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-3">
                        {ta.photo_url ? (
                          <img src={ta.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email}
                          </span>
                          <p className="text-xs text-zinc-400">{ta.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {ta.pay_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-1.5 rounded-full transition-all ${progress === 100 ? "bg-green-500" : progress > 0 ? "bg-blue-500" : "bg-zinc-300"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {missing.length === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            Complete
                          </span>
                        ) : (
                          missing.slice(0, 4).map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
                            >
                              {m}
                            </span>
                          ))
                        )}
                        {missing.length > 4 && (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            +{missing.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrainingToggle taId={ta.id} field="training_online" checked={ta.training_online} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrainingToggle taId={ta.id} field="training_offline" checked={ta.training_offline} />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-zinc-500">
                      {ta.qualifying_projects}/{ta.total_projects}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteTAButton id={ta.id} name={ta.first_name ? `${ta.first_name} ${ta.last_name}` : ta.email} />
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
