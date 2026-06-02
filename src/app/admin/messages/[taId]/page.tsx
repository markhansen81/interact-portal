import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { ChatThread } from "@/components/shared/chat-thread";

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ taId: string }>;
}) {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

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
    <ChatThread
      messages={messages || []}
      currentUserId={profile.id}
      otherUserId={taId}
      otherName={taName}
      otherPhoto={ta.photo_url}
      backHref="/admin/messages"
    />
  );
}
