import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TAWorkOrderView } from "@/components/portal/ta-work-order-view";

export default async function TAWorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const { id } = await params;
  const supabase = await createClient();

  const { data: wo } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .eq("ta_id", profile.id)
    .single();

  if (!wo) notFound();

  return (
    <div className="space-y-6">
      <TAWorkOrderView workOrder={wo} taName={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email} />
    </div>
  );
}
