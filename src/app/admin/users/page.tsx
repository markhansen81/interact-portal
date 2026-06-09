import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminUserManagement } from "@/components/admin/admin-user-management";

export default async function AdminUsersPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at")
    .eq("role", "admin")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          User Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage admin users. Only @interactenglish.de emails can be invited.
        </p>
      </div>
      <AdminUserManagement admins={admins || []} currentUserId={profile.id} />
    </div>
  );
}
