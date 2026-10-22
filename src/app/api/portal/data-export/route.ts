import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GDPR Art. 20 — Right to data portability.
 * Returns all of the authenticated TA's data as a JSON download.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 per hour per user
  const { ok } = rateLimit(`data-export:${user.id}`, 3, 3_600_000);
  if (!ok) return rateLimitResponse();

  // Fetch all TA data in parallel
  const [
    profileResult,
    workOrdersResult,
    invoicesResult,
    expensesResult,
    documentsResult,
    notificationsResult,
    programPrefsResult,
    availabilityResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("work_orders").select("*").eq("ta_id", user.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("ta_id", user.id).order("created_at", { ascending: false }),
    supabase.from("expense_claims").select("*").eq("ta_id", user.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("ta_program_preferences").select("*").eq("ta_id", user.id),
    supabase.from("ta_availability").select("*").eq("ta_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    gdpr_article: "Art. 20 DSGVO — Right to data portability",
    user_id: user.id,
    profile: profileResult.data || null,
    work_orders: workOrdersResult.data || [],
    invoices: invoicesResult.data || [],
    expense_claims: expensesResult.data || [],
    documents: documentsResult.data || [],
    notifications: notificationsResult.data || [],
    program_preferences: programPrefsResult.data || [],
    availability: availabilityResult.data || [],
  };

  // Audit log
  await logAudit({
    userId: user.id,
    action: "data_exported",
    targetId: user.id,
    targetType: "ta_profile",
    details: "GDPR data export requested by TA.",
  });

  // Return as downloadable JSON
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="interact-data-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
