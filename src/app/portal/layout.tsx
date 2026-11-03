import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalSidebar } from "@/components/portal/sidebar";
import { PortalHeader } from "@/components/portal/header";
import { PWARegister } from "@/components/portal/pwa-register";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth(["ta"]);

  if (!profile) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  // Fetch unread notification count and unread message count in parallel
  const [{ count: unreadCount }, { count: unreadMessages }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("read", false),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", profile.id)
      .is("read_at", null),
  ]);

  // No gate — dashboard shows onboarding tasks for everyone

  return (
    <div className="flex h-screen bg-white">
      <PWARegister />
      <PortalSidebar profile={profile} unreadCount={unreadCount ?? 0} unreadMessages={unreadMessages ?? 0} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader profile={profile} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
