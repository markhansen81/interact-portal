import { createClient } from "@/lib/supabase/server";

export default async function ContractsPage() {
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, profiles!contracts_ta_id_fkey(first_name, last_name, email)")
    .order("created_at", { ascending: false });

  const statusStyles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    sent: "bg-blue-100 text-blue-700",
    signed: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Contracts
        </h2>
      </div>

      {!contracts || contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No contracts yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Contracts will appear here when you send framework contracts or work orders to TAs.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">TA</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {contracts.map((c) => {
                const ta = c.profiles as { first_name: string; last_name: string; email: string } | null;
                return (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {c.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">{c.type}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[c.status] || ""}`}>
                        {c.status}
                      </span>
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
