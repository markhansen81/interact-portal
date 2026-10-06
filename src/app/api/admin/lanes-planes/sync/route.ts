import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTAsToLanesPlanes } from "@/lib/lanes-planes";

export async function POST(request: Request) {
  // Support both admin auth and cron secret
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const adminClient = createAdminClient();

  // Fetch ALL active TAs — L&P requires complete user list every time
  const { data: tas, error } = await adminClient
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("role", "ta")
    .eq("is_active", true);

  if (error || !tas) {
    return NextResponse.json(
      { error: "Failed to fetch TAs" },
      { status: 500 }
    );
  }

  // Filter out TAs without email
  const validTAs = tas.filter(
    (ta) => ta.email && ta.first_name && ta.last_name
  );

  // Also include admin users who need L&P access
  const { data: admins } = await adminClient
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("role", "admin")
    .eq("is_active", true);

  const adminUsers = (admins || [])
    .filter((a) => a.email && a.first_name && a.last_name)
    .map((a) => ({
      first_name: a.first_name,
      last_name: a.last_name,
      email: a.email,
    }));

  // Combine — admins get admin role, handled separately in the sync function
  // For now, only sync TAs as travellers
  const result = await syncTAsToLanesPlanes(validTAs);

  return NextResponse.json({
    ...result,
    synced: validTAs.length,
    skipped: tas.length - validTAs.length,
  });
}

// GET for cron job support
export async function GET(request: Request) {
  return POST(request);
}
