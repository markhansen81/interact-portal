import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const checks: Record<string, boolean> = {
    vercel: true,
    supabase: false,
    monday_key: !!process.env.MONDAY_API_TOKEN,
    insightly_key: !!process.env.INSIGHTLY_API_KEY,
    resend_key: !!process.env.RESEND_API_KEY,
    slack_webhook: !!process.env.SLACK_LEADS_WEBHOOK_URL,
  };

  // Check Supabase connection
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("leads").select("id").limit(1);
    checks.supabase = !error;
  } catch {
    checks.supabase = false;
  }

  const allOk = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
