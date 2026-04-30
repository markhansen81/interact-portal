import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { ChatThread } from "@/components/shared/chat-thread";

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ taId: string }>;
}) {
  const profile = await requireAuth(["admin"]);
  if (!profile) notFound();

  const { taId } = await params;
  const supabase = await createClient();

  const { data: ta } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url")
    .eq("id", taId)
    .single();

  if (!ta) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`and(from_user_id.eq.${profile.id},to_user_id.eq.${taId}),and(from_user_id.eq.${taId},to_user_id.eq.${profile.id})`)
    .order("created_at", { ascending: true });

  // Mark unread messages as read
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("from_user_id", taId)
    .eq("to_user_id", profile.id)
    .is("read_at", null);

  const taName = ta.first_name && ta.last_name
    ? `${ta.first_name} ${ta.last_name}`
    : ta.email;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {ta.photo_url ? (
          <img src={ta.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{taName}</h2>
          <p className="text-xs text-zinc-500">{ta.email}</p>
        </div>
      </div>
      <ChatThread
        messages={messages || []}
        currentUserId={profile.id}
        otherUserId={taId}
        backHref="/admin/messages"
      />
    </div>
  );
}
