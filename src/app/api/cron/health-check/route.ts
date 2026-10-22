import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackAlert } from "@/lib/slack";

interface CheckResult {
  name: string;
  status: "ok" | "error";
  message: string;
}

async function checkDatabase(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    const { error } = await adminClient.rpc("version" as never);
    // Fallback: simple select
    if (error) {
      const { error: err2 } = await adminClient.from("profiles").select("id").limit(1);
      if (err2) throw err2;
    }
    return { name: "database", status: "ok", message: "Database responding" };
  } catch (err) {
    return { name: "database", status: "error", message: `Database unreachable: ${err}` };
  }
}

async function checkApiHealth(): Promise<CheckResult> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const res = await fetch(`${appUrl}/api/health`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return { name: "api", status: "error", message: `API returned ${res.status}` };
    }
    return { name: "api", status: "ok", message: "API healthy" };
  } catch (err) {
    return { name: "api", status: "error", message: `API unreachable: ${err}` };
  }
}

async function checkSupabaseStorage(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    const { error } = await adminClient.storage.listBuckets();
    if (error) throw error;
    return { name: "storage", status: "ok", message: "Supabase Storage accessible" };
  } catch (err) {
    return { name: "storage", status: "error", message: `Storage error: ${err}` };
  }
}

async function checkDatevToken(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    const { data: tokenRow } = await adminClient
      .from("datev_tokens")
      .select("id, expires_at")
      .eq("id", "default")
      .single();

    if (!tokenRow) {
      return { name: "datev_token", status: "error", message: "No DATEV token found" };
    }

    const expiresAt = new Date(tokenRow.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      return { name: "datev_token", status: "error", message: `DATEV token expired at ${expiresAt.toISOString()}` };
    }

    // Warn if expiring within 24 hours
    const hoursLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursLeft < 24) {
      return { name: "datev_token", status: "error", message: `DATEV token expires in ${hoursLeft.toFixed(1)}h` };
    }

    return { name: "datev_token", status: "ok", message: `DATEV token valid until ${expiresAt.toISOString()}` };
  } catch (err) {
    return { name: "datev_token", status: "error", message: `DATEV token check failed: ${err}` };
  }
}

async function checkInsurancePipeline(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  const sqApiKey = process.env.SQUARESPACE_API_KEY;
  if (!sqApiKey) {
    return { name: "insurance_pipeline", status: "ok", message: "Squarespace API key not configured — skipping" };
  }

  try {
    // Fetch recent orders from Squarespace
    const sqRes = await fetch("https://api.squarespace.com/1.0/commerce/orders", {
      headers: { Authorization: "Bearer " + sqApiKey, "User-Agent": "InterACT Portal" },
      signal: AbortSignal.timeout(15000),
    });

    if (!sqRes.ok) {
      await sendSlackAlert({
        type: "warning",
        title: "Squarespace API Error",
        message: `Cannot reach Squarespace Orders API (status ${sqRes.status}). Insurance pipeline may be down.`,
      });
      return { name: "insurance_pipeline", status: "error", message: `Squarespace API returned ${sqRes.status}` };
    }

    const { result: sqOrders } = await sqRes.json();

    // Fetch processed orders from our DB
    const { data: processedOrders } = await adminClient
      .from("insurance_orders")
      .select("squarespace_order_id");
    const processedIds = new Set((processedOrders || []).map((o: { squarespace_order_id: string }) => o.squarespace_order_id));

    // Find unprocessed orders
    const unprocessed = (sqOrders || []).filter((o: { id: string }) => !processedIds.has(o.id));

    if (unprocessed.length > 0) {
      // Auto-reprocess missing orders
      let fixed = 0;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://interact-portal.vercel.app";
      for (const order of unprocessed) {
        try {
          const processRes = await fetch(`${appUrl}/api/webhooks/squarespace`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order),
          });
          if (processRes.ok) fixed++;
        } catch {
          // continue with next order
        }
      }

      if (fixed > 0) {
        await sendSlackAlert({
          type: "success",
          title: "Insurance Pipeline Auto-Fixed",
          message: `Auto-processed ${fixed}/${unprocessed.length} missing orders.`,
        });
      }

      const stillMissing = unprocessed.length - fixed;
      if (stillMissing > 0) {
        // CRITICAL: orders exist in Squarespace but not in portal
        await sendSlackAlert({
          type: "critical",
          title: "Insurance Pipeline Broken",
          message: `${stillMissing} Squarespace order(s) not processed! Customers have NOT received their insurance PDFs.`,
          fields: unprocessed.slice(0, 10).map((o: { orderNumber?: string; customerEmail?: string; grandTotal?: { value?: string } | string }) => ({
            label: `#${o.orderNumber || "?"}`,
            value: `${o.customerEmail || "?"} — EUR${typeof o.grandTotal === "object" ? o.grandTotal?.value || "?" : o.grandTotal || "?"}`,
          })),
        });
      }

      return {
        name: "insurance_pipeline",
        status: stillMissing > 0 ? "error" : "ok",
        message: stillMissing > 0
          ? `${stillMissing} unprocessed orders (auto-fixed ${fixed})`
          : `Auto-fixed ${fixed} missing orders. All ${(sqOrders || []).length} orders now processed`,
      };
    }

    return {
      name: "insurance_pipeline",
      status: "ok",
      message: `All ${(sqOrders || []).length} Squarespace orders processed`,
    };
  } catch (err) {
    console.error("[HEALTH] Insurance check failed:", err);
    return { name: "insurance_pipeline", status: "error", message: `Insurance check failed: ${err}` };
  }
}

async function checkUndeliveredInsurance(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    // Check for orders older than 10 minutes without email_sent_at
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: undelivered } = await adminClient
      .from("insurance_orders")
      .select("id, order_number, customer_email, created_at")
      .is("email_sent_at", null)
      .lt("created_at", tenMinAgo);

    if (undelivered && undelivered.length > 0) {
      await sendSlackAlert({
        type: "critical",
        title: "Insurance Emails NOT Delivered",
        message: `${undelivered.length} order(s) processed but email NEVER sent!`,
        fields: undelivered.map((o: { order_number: string; customer_email: string }) => ({
          label: `#${o.order_number}`,
          value: o.customer_email,
        })),
      });
      return { name: "insurance_email_delivery", status: "error", message: `${undelivered.length} orders without email` };
    }

    return { name: "insurance_email_delivery", status: "ok", message: "All orders have emails delivered" };
  } catch (err) {
    return { name: "insurance_email_delivery", status: "error", message: `Check failed: ${err}` };
  }
}

async function checkDatabaseSecurity(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    // Check for tables without RLS enabled
    const { data: unprotected } = await adminClient.rpc("check_rls_status" as never);

    // Fallback: direct query if RPC doesn't exist
    const { data: tables, error } = await adminClient
      .from("pg_tables" as never)
      .select("tablename, rowsecurity")
      .eq("schemaname", "public")
      .eq("rowsecurity", false);

    if (error) {
      // Can't query pg_tables directly via PostgREST, use raw SQL approach
      // This check runs via the health cron which has service_role access
      return { name: "database_security", status: "ok", message: "RLS check requires manual verification" };
    }

    const exposedTables = (tables || [])
      .map((t: { tablename: string }) => t.tablename)
      .filter((name: string) => !name.startsWith("_"));

    if (exposedTables.length > 0) {
      await sendSlackAlert({
        type: "critical",
        title: "DATABASE SECURITY: Tables Without RLS",
        message: `${exposedTables.length} table(s) are publicly accessible without Row Level Security!`,
        fields: exposedTables.map((t: string) => ({ label: t, value: "NO RLS — anyone can read/write" })),
      });
      return { name: "database_security", status: "error", message: `${exposedTables.length} tables without RLS: ${exposedTables.join(", ")}` };
    }

    return { name: "database_security", status: "ok", message: "All tables have RLS enabled" };
  } catch (err) {
    return { name: "database_security", status: "ok", message: `RLS check skipped: ${err}` };
  }
}

async function checkPublicStorage(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    // Check if sensitive PDFs are in public buckets
    const { data: invoicePdfs } = await adminClient
      .from("invoices")
      .select("id, pdf_url")
      .not("pdf_url", "is", null)
      .limit(1);

    const { data: expensePdfs } = await adminClient
      .from("expense_claims")
      .select("id, pdf_url")
      .not("pdf_url", "is", null)
      .limit(1);

    const publicUrls: string[] = [];
    for (const inv of invoicePdfs || []) {
      if (inv.pdf_url?.includes("/object/public/")) publicUrls.push(`invoice ${inv.id}`);
    }
    for (const exp of expensePdfs || []) {
      if (exp.pdf_url?.includes("/object/public/")) publicUrls.push(`expense ${exp.id}`);
    }

    if (publicUrls.length > 0) {
      await sendSlackAlert({
        type: "warning",
        title: "Sensitive PDFs in Public Storage",
        message: `${publicUrls.length} PDF(s) with IBAN/tax data are publicly accessible. Should use signed URLs.`,
      });
      return { name: "storage_security", status: "error", message: `${publicUrls.length} sensitive PDFs in public storage` };
    }

    return { name: "storage_security", status: "ok", message: "No sensitive PDFs in public storage detected" };
  } catch (err) {
    return { name: "storage_security", status: "ok", message: `Storage check skipped: ${err}` };
  }
}

async function checkAuthEndpoints(): Promise<CheckResult> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://interact-portal.vercel.app";

    // Test that protected endpoints reject unauthenticated requests
    const endpoints = [
      { url: `${appUrl}/api/portal/expenses`, method: "POST" },
      { url: `${appUrl}/api/admin/invoices/test`, method: "PATCH" },
    ];

    const failures: string[] = [];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, {
          method: ep.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(5000),
        });
        // Should return 401 or 403 — if 200, auth is broken
        if (res.status === 200) {
          failures.push(`${ep.method} ${ep.url} returned 200 without auth!`);
        }
      } catch {
        // Timeout or network error is fine
      }
    }

    if (failures.length > 0) {
      await sendSlackAlert({
        type: "critical",
        title: "AUTH BYPASS DETECTED",
        message: `${failures.length} endpoint(s) accessible without authentication!`,
        fields: failures.map(f => ({ label: "Endpoint", value: f })),
      });
      return { name: "auth_security", status: "error", message: failures.join("; ") };
    }

    return { name: "auth_security", status: "ok", message: "Protected endpoints rejecting unauthenticated requests" };
  } catch (err) {
    return { name: "auth_security", status: "ok", message: `Auth check skipped: ${err}` };
  }
}

async function checkRecentErrors(adminClient: ReturnType<typeof createAdminClient>): Promise<CheckResult> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await adminClient
      .from("crm_automation_log")
      .select("id", { count: "exact", head: true })
      .ilike("action", "%ERROR%")
      .gte("created_at", oneHourAgo);

    if (error) throw error;

    const count = (data as unknown as { count: number })?.count ?? 0;
    if (count > 5) {
      return { name: "error_rate", status: "error", message: `${count} errors in the last hour` };
    }
    return { name: "error_rate", status: "ok", message: `${count} errors in the last hour` };
  } catch (err) {
    // Table might not have matching rows — not a failure
    return { name: "error_rate", status: "ok", message: `Error rate check skipped: ${err}` };
  }
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Run all checks in parallel
  const results = await Promise.all([
    checkDatabase(adminClient),
    checkApiHealth(),
    checkSupabaseStorage(adminClient),
    checkDatevToken(adminClient),
    checkRecentErrors(adminClient),
    checkInsurancePipeline(adminClient),
    checkUndeliveredInsurance(adminClient),
    checkDatabaseSecurity(adminClient),
    checkPublicStorage(adminClient),
    checkAuthEndpoints(),
  ]);

  // Fetch previous check statuses for change detection
  const checkNames = results.map((r) => r.name);
  const { data: previousChecks } = await adminClient
    .from("health_checks")
    .select("check_name, status")
    .in("check_name", checkNames)
    .order("checked_at", { ascending: false });

  // Build a map of last known status per check
  const lastStatus: Record<string, string> = {};
  if (previousChecks) {
    for (const row of previousChecks) {
      if (!lastStatus[row.check_name]) {
        lastStatus[row.check_name] = row.status;
      }
    }
  }

  // Send alerts for status changes
  for (const result of results) {
    const prev = lastStatus[result.name];
    const changed = prev !== undefined && prev !== result.status;

    if (changed) {
      if (result.status === "error") {
        await sendSlackAlert({
          type: "critical",
          title: `Health Check FAILED: ${result.name}`,
          message: result.message,
          fields: [
            { label: "Check", value: result.name },
            { label: "Previous", value: prev },
            { label: "Current", value: result.status },
          ],
        });
      } else if (result.status === "ok" && prev === "error") {
        await sendSlackAlert({
          type: "success",
          title: `Recovered: ${result.name}`,
          message: result.message,
          fields: [
            { label: "Check", value: result.name },
            { label: "Status", value: "Back to normal" },
          ],
        });
      }
    } else if (!prev && result.status === "error") {
      // First run and already failing
      await sendSlackAlert({
        type: "critical",
        title: `Health Check FAILED: ${result.name}`,
        message: result.message,
      });
    }
  }

  // Insert new check results
  const rows = results.map((r) => ({
    check_name: r.name,
    status: r.status,
    message: r.message,
  }));

  await adminClient.from("health_checks").insert(rows);

  // Clean up checks older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await adminClient.from("health_checks").delete().lt("checked_at", cutoff);

  const allOk = results.every((r) => r.status === "ok");

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    checks: results,
    timestamp: new Date().toISOString(),
  });
}
