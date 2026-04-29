import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const profile = await getCurrentUser();

  if (!profile) return null;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return profile;
}
