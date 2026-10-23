import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth(["admin"]);

  if (!profile) {
    redirect("/auth/admin");
  }

  return (
    <div className="flex h-screen bg-white">
      <AdminSidebar isSuperAdmin={!!profile.is_super_admin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader email={profile.email} />
        <main className="flex-1 overflow-y-auto px-12 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
