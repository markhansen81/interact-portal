import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { PortalSidebar } from "@/components/portal/sidebar";
import { PortalHeader } from "@/components/portal/header";

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
      <PortalSidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader profile={profile} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
