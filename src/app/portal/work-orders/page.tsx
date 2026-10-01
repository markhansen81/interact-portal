import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorkOrderTable } from "@/components/portal/work-order-table";

export default async function TAWorkOrdersPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, project_name, program_type, school, location, start_date, end_date, days, total, status, sign_by, pdf_url, created_at")
    .eq("ta_id", profile.id)
    .order("created_at", { ascending: false });

  // Find linked projects for signed WOs
  const { data: projects } = await supabase
    .from("projects")
    .select("id, work_order_id")
    .eq("ta_id", profile.id);

  const projectMap: Record<string, string> = {};
  for (const p of projects || []) {
    if (p.work_order_id) projectMap[p.work_order_id] = p.id;
  }

  return <WorkOrderTable workOrders={workOrders || []} projectMap={projectMap} />;
}
