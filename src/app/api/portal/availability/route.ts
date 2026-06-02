import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("availability")
    .select("*")
    .eq("ta_id", user.id);

  return NextResponse.json({ availability: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dates, status } = await request.json() as { dates: string[]; status: string };

  if (status === "unavailable") {
    // Remove entries (unavailable is the default — no row means unavailable)
    await supabase
      .from("availability")
      .delete()
      .eq("ta_id", user.id)
      .in("date", dates);
  } else {
    // Insert/update as available
    const rows = dates.map((date) => ({ ta_id: user.id, date, status }));
    await supabase.from("availability").upsert(rows, { onConflict: "ta_id,date" });
  }

  return NextResponse.json({ success: true });
}
