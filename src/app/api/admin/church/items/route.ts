import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const profile = await requireAuth(["admin"]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("church_items")
    .select(
      "id, name, school_name, source, deal_stage, opp_status, program_type, " +
      "num_students, num_groups, num_days, num_tas, price_pp, grade_level, " +
      "city, state, street, contact_email, teacher_contact, start_date, end_date"
    )
    .in("source", ["opportunity", "project"])
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data || [] });
}
