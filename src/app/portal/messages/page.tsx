import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TAMessagesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select("*, sender:profiles!messages_from_user_id_fkey(first_name, last_name)")
    .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Messages
      </h2>

      {!messages || messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No messages yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Messages from the InterACT team will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => {
            const isFromMe = msg.from_user_id === profile.id;
            const sender = msg.sender as { first_name: string; last_name: string } | null;
            return (
              <div
                key={msg.id}
                className={`rounded-xl border p-4 ${
                  isFromMe
                    ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-500">
                    {isFromMe
                      ? "You"
                      : sender
                        ? `${sender.first_name} ${sender.last_name}`
                        : "InterACT"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
                  {msg.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
