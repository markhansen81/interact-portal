import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function TAMessagesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  // Use admin client so RLS doesn't block reading admin profiles
  const adminClient = createAdminClient();

  const { data: admins } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url")
    .eq("role", "admin")
    .order("first_name");

  if (!admins || admins.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Messages" />
        <div className="border border-dashed border-neutral-300 rounded-lg p-12 text-center">
          <p className="text-neutral-500">No team members available to message.</p>
        </div>
      </div>
    );
  }

  // Get last message + unread count per admin
  const adminIds = admins.map((a) => a.id);
  const { data: allMessages } = await supabase
    .from("messages")
    .select("id, from_user_id, to_user_id, body, created_at, read_at")
    .or(
      adminIds
        .map((aid) => `and(from_user_id.eq.${profile.id},to_user_id.eq.${aid}),and(from_user_id.eq.${aid},to_user_id.eq.${profile.id})`)
        .join(",")
    )
    .order("created_at", { ascending: false });

  const threadsByAdmin = new Map<
    string,
    { lastMessage: string; lastAt: string; unread: number }
  >();

  for (const admin of admins) {
    const msgs = (allMessages || []).filter(
      (m) =>
        (m.from_user_id === profile.id && m.to_user_id === admin.id) ||
        (m.from_user_id === admin.id && m.to_user_id === profile.id)
    );
    const last = msgs[0]; // already sorted desc
    const unread = msgs.filter(
      (m) => m.from_user_id === admin.id && m.to_user_id === profile.id && !m.read_at
    ).length;
    threadsByAdmin.set(admin.id, {
      lastMessage: last?.body || "",
      lastAt: last?.created_at || "",
      unread,
    });
  }

  // Sort: admins with messages first (most recent), then the rest
  const sorted = [...admins].sort((a, b) => {
    const ta = threadsByAdmin.get(a.id)?.lastAt || "";
    const tb = threadsByAdmin.get(b.id)?.lastAt || "";
    return tb.localeCompare(ta);
  });

  function timeAgo(iso: string) {
    if (!iso) return "";
    // eslint-disable-next-line react-hooks/purity -- server component: Date.now() runs once per request
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="Messages" description="Message the InterACT team" />

      <div className="rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
        {sorted.map((admin) => {
          const thread = threadsByAdmin.get(admin.id);
          const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ") || admin.email;
          const initials = [admin.first_name?.[0], admin.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

          return (
            <Link
              key={admin.id}
              href={`/portal/messages/${admin.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors"
            >
              {/* Avatar */}
              {admin.photo_url ? (
                <img src={admin.photo_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
                  {initials}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${thread?.unread ? "font-semibold text-neutral-900" : "font-medium text-neutral-800"}`}>
                    {name}
                  </p>
                  {thread?.lastAt && (
                    <span className="text-xs text-neutral-400 shrink-0">{timeAgo(thread.lastAt)}</span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${thread?.unread ? "text-neutral-700 font-medium" : "text-neutral-400"}`}>
                  {thread?.lastMessage || "Start a conversation"}
                </p>
              </div>

              {/* Unread badge */}
              {(thread?.unread ?? 0) > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {(thread?.unread ?? 0) > 9 ? "9+" : thread?.unread}
                </span>
              )}

              {/* Chevron */}
              <svg className="h-4 w-4 text-neutral-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
