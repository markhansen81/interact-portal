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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, status } = await request.json();

  // Upsert — toggle availability
  if (status === "available") {
    // Remove entry (available is the default)
    await supabase
      .from("availability")
      .delete()
      .eq("ta_id", user.id)
      .eq("date", date);
  } else {
    await supabase.from("availability").upsert(
      { ta_id: user.id, date, status },
      { onConflict: "ta_id,date" }
    );
  }

  return NextResponse.json({ success: true });
}
