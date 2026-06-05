import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function MessagesPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  // Get latest message and unread count per TA
  const { data: messages } = await supabase
    .from("messages")
    .select("from_user_id, to_user_id, body, created_at, read_at")
    .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  // Build per-TA stats
  const taStats = new Map<string, { lastMessage: string; lastTime: string; unread: number }>();
  for (const msg of messages || []) {
    const taId = msg.from_user_id === profile.id ? msg.to_user_id : msg.from_user_id;
    if (!taStats.has(taId)) {
      taStats.set(taId, { lastMessage: msg.body, lastTime: msg.created_at, unread: 0 });
    }
    // Count unread (messages FROM ta TO admin that are unread)
    if (msg.to_user_id === profile.id && !msg.read_at) {
      const s = taStats.get(taId)!;
      s.unread++;
    }
  }

  // Sort TAs: unread first, then by last message time, then alphabetical
  const sortedTAs = (tas || []).sort((a, b) => {
    const aStats = taStats.get(a.id);
    const bStats = taStats.get(b.id);
    // Unread first
    if ((aStats?.unread || 0) > 0 && !(bStats?.unread || 0)) return -1;
    if (!(aStats?.unread || 0) && (bStats?.unread || 0) > 0) return 1;
    // Then by last message time
    if (aStats?.lastTime && bStats?.lastTime) return new Date(bStats.lastTime).getTime() - new Date(aStats.lastTime).getTime();
    if (aStats?.lastTime) return -1;
    if (bStats?.lastTime) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">Chat with your teaching artists.</p>
      </div>

      {sortedTAs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No teaching artists to message yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {sortedTAs.map((ta, i) => {
            const stats = taStats.get(ta.id);
            const name = ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email;
            const initials = [ta.first_name?.[0], ta.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

            return (
              <Link
                href={`/admin/messages/${ta.id}`}
                key={ta.id}
                className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  i < sortedTAs.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""
                } ${stats?.unread ? "bg-blue-50/30 dark:bg-blue-900/5" : ""}`}
              >
                {/* Avatar */}
                <div className="relative">
                  {ta.photo_url ? (
                    <img src={ta.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {initials}
                    </div>
                  )}
                  {(stats?.unread || 0) > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                      {stats!.unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${stats?.unread ? "font-bold text-zinc-900 dark:text-zinc-50" : "font-medium text-zinc-900 dark:text-zinc-50"}`}>
                      {name}
                    </p>
                    {stats?.lastTime && (
                      <span className="text-[11px] text-zinc-400">
                        {formatTime(stats.lastTime)}
                      </span>
                    )}
                  </div>
                  {stats?.lastMessage ? (
                    <p className={`mt-0.5 truncate text-[13px] ${stats.unread ? "font-medium text-zinc-700 dark:text-zinc-300" : "text-zinc-500"}`}>
                      {stats.lastMessage}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[13px] text-zinc-400 italic">No messages yet</p>
                  )}
                </div>

                {/* Arrow */}
                <svg className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
