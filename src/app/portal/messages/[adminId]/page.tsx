import { redirect, notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatThread } from "@/components/shared/chat-thread";

interface Props {
  params: Promise<{ adminId: string }>;
}

export default async function TAMessageThreadPage({ params }: Props) {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const { adminId } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch admin profile (using admin client to bypass RLS)
  const { data: admin } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url, role")
    .eq("id", adminId)
    .eq("role", "admin")
    .single();

  if (!admin) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`and(from_user_id.eq.${profile.id},to_user_id.eq.${admin.id}),and(from_user_id.eq.${admin.id},to_user_id.eq.${profile.id})`)
    .order("created_at", { ascending: true });

  // Mark messages from admin as read
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("from_user_id", admin.id)
    .eq("to_user_id", profile.id)
    .is("read_at", null);

  const adminName = [admin.first_name, admin.last_name].filter(Boolean).join(" ") || admin.email;

  return (
    <ChatThread
      messages={messages || []}
      currentUserId={profile.id}
      otherUserId={admin.id}
      otherName={adminName}
      otherPhoto={admin.photo_url}
      backHref="/portal/messages"
    />
  );
}
