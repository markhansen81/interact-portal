import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LanesPlanePanel } from "@/components/admin/lanes-planes-panel";

export default async function LanesPlanesPAge() {
 const profile = await requireAuth(["admin"]);
 if (!profile) redirect("/auth/admin");

 const supabase = await createClient();

 const { data: tas } = await supabase
 .from("profiles")
 .select(
 "id, first_name, last_name, email, is_active, lanes_planes_synced, lanes_planes_synced_at"
 )
 .eq("role", "ta")
 .order("first_name");

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
 Lanes &amp; Planes
 </h1>
 <p className="mt-1 text-sm text-neutral-500">
 Manage TA travel sync with Lanes &amp; Planes. Every sync sends the
 full list of active TAs — missing users are deactivated in L&amp;P.
 </p>
 </div>
 <LanesPlanePanel tas={tas || []} />
 </div>
 );
}
