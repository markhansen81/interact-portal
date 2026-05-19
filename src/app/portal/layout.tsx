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

  // Gate: redirect to onboarding if still pending (never started)
  if (profile.onboarding_status === "pending" || !profile.onboarding_status) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <PortalSidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
