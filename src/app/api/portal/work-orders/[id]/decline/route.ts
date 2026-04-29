import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, ta_id, status")
    .eq("id", id)
    .eq("ta_id", user.id)
    .eq("status", "sent")
    .single();

  if (!wo) {
    return NextResponse.json({ error: "Work order not found or not declinable" }, { status: 404 });
  }

  const { error } = await supabase
    .from("work_orders")
    .update({ status: "declined" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // TODO: Notify admin of decline

  return NextResponse.json({ success: true });
}
