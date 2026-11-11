import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessagesList } from "@/components/admin/messages-list";

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

 const statsRecord: Record<string, { lastMessage: string; lastTime: string; unread: number }> = {};
 for (const [id, s] of taStats.entries()) {
   statsRecord[id] = s;
 }

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Messages</h1>
 <p className="mt-1 text-sm text-neutral-500">Chat with your teaching artists.</p>
 </div>

 {sortedTAs.length === 0 ? (
 <div className="rounded-sm border border-dashed border-neutral-300 bg-white p-12 text-center">
 <p className="text-neutral-500">No teaching artists to message yet.</p>
 </div>
 ) : (
   <MessagesList tas={sortedTAs} taStats={statsRecord} />
 )}
 </div>
 );
}
