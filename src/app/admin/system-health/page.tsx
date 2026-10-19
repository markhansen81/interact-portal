import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SystemHealthPanel } from "@/components/admin/system-health-panel";

export default async function SystemHealthPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  // Super admin only
  if (!profile.is_super_admin) redirect("/admin");

  const adminClient = createAdminClient();

  // Fetch SECURITY_REPORT.md from GitHub
  const reportRes = await fetch(
    "https://raw.githubusercontent.com/markhansen81/interact-portal/main/SECURITY_REPORT.md",
    { next: { revalidate: 300 } } // cache 5 min
  );
  const reportContent = reportRes.ok ? await reportRes.text() : null;

  // Fetch counts
  const [
    { count: profilesCount },
    { count: activeProfilesCount },
    { count: inactiveProfilesCount },
    { count: invoicesCount },
    { count: invoicesSubmitted },
    { count: invoicesApproved },
    { count: invoicesPaid },
    { count: expensesCount },
    { count: expensesSubmitted },
    { count: expensesApproved },
    { count: expensesPaid },
    { count: adminUploadsCount },
    { count: adminUploadsOutstanding },
    { count: adminUploadsPaid },
    { count: projectsCount },
  ] = await Promise.all([
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "ta"),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "ta").eq("is_active", true),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "ta").eq("is_active", false),
    adminClient.from("invoices").select("*", { count: "exact", head: true }),
    adminClient.from("invoices").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    adminClient.from("invoices").select("*", { count: "exact", head: true }).eq("status", "approved"),
    adminClient.from("invoices").select("*", { count: "exact", head: true }).eq("status", "paid"),
    adminClient.from("expense_claims").select("*", { count: "exact", head: true }),
    adminClient.from("expense_claims").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    adminClient.from("expense_claims").select("*", { count: "exact", head: true }).eq("status", "approved"),
    adminClient.from("expense_claims").select("*", { count: "exact", head: true }).eq("status", "paid"),
    adminClient.from("admin_uploads").select("*", { count: "exact", head: true }),
    adminClient.from("admin_uploads").select("*", { count: "exact", head: true }).neq("status", "paid"),
    adminClient.from("admin_uploads").select("*", { count: "exact", head: true }).eq("status", "paid"),
    adminClient.from("projects").select("*", { count: "exact", head: true }),
  ]);

  // Fetch recent health checks (last 24h)
  const { data: healthChecks } = await adminClient
    .from("health_checks")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(100);

  // Recent CRM automation logs
  const { data: recentLogs } = await adminClient
    .from("crm_automation_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // DATEV connection status
  const { data: tokenRow } = await adminClient
    .from("datev_tokens")
    .select("id, connected_at, expires_at")
    .eq("id", "default")
    .single();

  const datevConnected = !!tokenRow?.connected_at;
  const datevExpired = tokenRow?.expires_at
    ? new Date(tokenRow.expires_at) < new Date()
    : true;

  // Check env vars (server-side only)
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasSquarespaceKey = !!process.env.SQUARESPACE_API_KEY;

  // Insurance pipeline stats
  const { count: insuranceOrdersCount } = await adminClient
    .from("insurance_orders")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          System Health
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Virtual CTO security audit, system status, and operational overview.
        </p>
      </div>

      <SystemHealthPanel
        reportContent={reportContent}
        stats={{
          profiles: profilesCount ?? 0,
          activeTAs: activeProfilesCount ?? 0,
          inactiveTAs: inactiveProfilesCount ?? 0,
          invoices: invoicesCount ?? 0,
          invoicesSubmitted: invoicesSubmitted ?? 0,
          invoicesApproved: invoicesApproved ?? 0,
          invoicesPaid: invoicesPaid ?? 0,
          expenses: expensesCount ?? 0,
          expensesSubmitted: expensesSubmitted ?? 0,
          expensesApproved: expensesApproved ?? 0,
          expensesPaid: expensesPaid ?? 0,
          adminUploads: adminUploadsCount ?? 0,
          adminUploadsOutstanding: adminUploadsOutstanding ?? 0,
          adminUploadsPaid: adminUploadsPaid ?? 0,
          projects: projectsCount ?? 0,
        }}
        recentLogs={recentLogs ?? []}
        datevConnected={datevConnected}
        datevExpired={datevExpired}
        hasResendKey={hasResendKey}
        hasAnthropicKey={hasAnthropicKey}
        healthChecks={healthChecks ?? []}
        hasSquarespaceKey={hasSquarespaceKey}
        insuranceOrdersCount={insuranceOrdersCount ?? 0}
      />
    </div>
  );
}
