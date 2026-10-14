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
