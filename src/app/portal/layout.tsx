import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
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

  // No gate — dashboard shows onboarding tasks for everyone

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <PWARegister />
      <PortalSidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader profile={profile} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-4 pb-20 md:px-8 md:py-8 md:pb-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
