import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TACalendar } from "@/components/portal/ta-calendar";

export default async function CalendarPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, project_name, school, start_date, end_date, status")
    .eq("ta_id", profile.id)
    .in("status", ["sent", "signed"])
    .order("start_date", { ascending: true });

  return <TACalendar workOrders={workOrders || []} />;
}
