import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DatevSettingsPanel } from "@/components/admin/datev-settings-panel";

export default async function DatevSettingsPage() {
 const profile = await requireAuth(["admin"]);
 if (!profile) redirect("/auth/admin");

 // Super admin only
 if (!profile.is_super_admin) redirect("/admin");

 const adminClient = createAdminClient();

 // Fetch stored DATEV connection
 const { data: tokenRow } = await adminClient
 .from("datev_tokens")
 .select("id, connected_at, expires_at, selected_client_id, selected_client_name")
 .eq("id", "default")
 .single();

 const isConnected = !!tokenRow?.connected_at;
 const isExpired = tokenRow?.expires_at
 ? new Date(tokenRow.expires_at) < new Date()
 : true;

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
 DATEV Settings
 </h1>
 <p className="mt-1 text-sm text-neutral-500">
 Connect to DATEV for automatic document uploads.
 </p>
 </div>

 <DatevSettingsPanel
 isConnected={isConnected}
 isExpired={isExpired}
 connectedAt={tokenRow?.connected_at ?? null}
 selectedClientId={tokenRow?.selected_client_id ?? null}
 selectedClientName={tokenRow?.selected_client_name ?? null}
 />
 </div>
 );
}
