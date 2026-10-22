import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  let dbOk = false;

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("leads").select("id").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "degraded";

  return NextResponse.json(
    { status, timestamp: new Date().toISOString() },
    { status: dbOk ? 200 : 503 }
  );
}
