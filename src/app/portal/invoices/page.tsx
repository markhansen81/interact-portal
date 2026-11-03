import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatCard } from "@/components/ui";
import { InvoicesPageClient } from "@/components/portal/invoices-page-client";

export default async function TAInvoicesPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch signed work orders (include standby projects too)
  const { data: signedWOs, error: woError } = await supabase
    .from("work_orders")
    .select("id, project_name, school, days, total, program_type, start_date, end_date")
    .eq("ta_id", profile.id)
    .in("status", ["signed", "standby"])
    .order("start_date", { ascending: false });

  if (woError) console.error("[invoices] WO query error:", woError);

  // Fetch travel_hours + equipment_provided separately (new columns, handle gracefully)
  const woIds = (signedWOs || []).map((w) => w.id);
  let woExtras: Record<string, { travel_hours: number | null; equipment_provided: boolean | null }> = {};
  if (woIds.length > 0) {
    const { data: extras } = await supabase
      .from("work_orders")
      .select("id, travel_hours, equipment_provided")
      .in("id", woIds);
    for (const e of extras || []) {
      woExtras[e.id] = { travel_hours: e.travel_hours ?? null, equipment_provided: e.equipment_provided ?? null };
    }
  }

  // Fetch submitted invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, status, submitted_at, work_order_id")
    .eq("ta_id", profile.id)
    .order("created_at", { ascending: false });

  // Fetch pay scales to pre-calculate expected fees
  const { data: payScales } = await adminClient
    .from("pay_scales")
    .select("scale_type, level, rates");

  // Fetch travel stipends
  const { data: travelStipends } = await adminClient
    .from("travel_stipends")
    .select("min_hours, max_hours, amount")
    .order("min_hours");

  // Pre-calculate expected fee + travel stipend for each WO
  function calcExpectedFee(programType: string, days: number): number | null {
    if (!payScales) return null;
    const isCamp = /camp|sommer/i.test(programType || "");
    const scaleType = isCamp ? "camps" : "programs";
    const level = isCamp ? (profile.camp_level ?? 1) : (profile.pay_level ?? 1);
    const scale = payScales.find((s) => s.scale_type === scaleType && s.level === level);
    if (!scale?.rates) return null;
    const fee = scale.rates[String(days)];
    return fee != null ? Number(fee) : null;
  }

  function calcTravelStipend(travelHours: number | null): number | null {
    if (!travelHours || !travelStipends) return null;
    const bracket = travelStipends.find(
      (ts) => travelHours >= Number(ts.min_hours) && (ts.max_hours == null || travelHours < Number(ts.max_hours))
    );
    return bracket ? Number(bracket.amount) : null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enrichedWOs = (signedWOs || []).map((wo) => {
    const extras = woExtras[wo.id] || { travel_hours: null, equipment_provided: null };
    // Invoice available the day after project ends
    const endDate = wo.end_date ? new Date(wo.end_date) : null;
    const availableFrom = endDate ? new Date(endDate.getTime() + 86400000) : null;
    const uploadLocked = availableFrom ? availableFrom > today : false;
    const availableFromStr = availableFrom ? availableFrom.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

    return {
      ...wo,
      travel_hours: extras.travel_hours,
      equipment_provided: extras.equipment_provided,
      expected_fee: calcExpectedFee(wo.program_type, wo.days),
      travel_stipend: calcTravelStipend(extras.travel_hours),
      upload_locked: uploadLocked,
      available_from: availableFromStr,
    };
  });

  // Summary stats
  const totalPaid = (invoices || [])
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total), 0);
  const pendingCount = (invoices || []).filter((i) =>
    ["submitted", "approved"].includes(i.status)
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Upload and track your project invoices" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pay Level" value={`Level ${profile.pay_level ?? "—"}`} />
        <StatCard label="Qualifying Projects" value={profile.qualifying_projects ?? 0} />
        <StatCard label="Pending Invoices" value={pendingCount} />
        <StatCard label="Total Paid" value={`€${totalPaid.toFixed(0)}`} />
      </div>

      <InvoicesPageClient
        workOrders={enrichedWOs}
        invoices={invoices || []}
        profile={profile}
      />
    </div>
  );
}
