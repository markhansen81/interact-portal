import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/shared/chat-thread";

export default async function TAMessagesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  // Get admin to chat with (first admin found)
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("role", "admin")
    .limit(1);

  const admin = admins?.[0];

  if (!admin) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Messages</h2>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No admin available to message.</p>
        </div>
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`and(from_user_id.eq.${profile.id},to_user_id.eq.${admin.id}),and(from_user_id.eq.${admin.id},to_user_id.eq.${profile.id})`)
    .order("created_at", { ascending: true });

  // Mark unread as read
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("from_user_id", admin.id)
    .eq("to_user_id", profile.id)
    .is("read_at", null);

  const adminName = admin.first_name && admin.last_name
    ? `${admin.first_name} ${admin.last_name}`
    : admin.email;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Chat with {adminName}
      </h2>
      <ChatThread
        messages={messages || []}
        currentUserId={profile.id}
        otherUserId={admin.id}
        backHref="/portal"
      />
    </div>
  );
}
