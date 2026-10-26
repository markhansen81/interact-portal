import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = await createClient();

  // Generate offer number: ANG-YYYY-NNNN
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("offers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`);
  const seq = String((count || 0) + 1).padStart(4, "0");
  const offerNumber = `ANG-${year}-${seq}`;

  // Calculate total
  const total = (body.price_pp || 0) * (body.num_students || 0);

  const { data, error } = await supabase
    .from("offers")
    .insert({
      offer_number: offerNumber,
      lead_id: body.lead_id || null,
      church_item_id: body.church_item_id || null,
      school_name: body.school_name,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      school_address: body.school_address,
      city: body.city,
      postcode: body.postcode,
      state: body.state,
      program_type: body.program_type,
      grade_level: body.grade_level,
      num_students: body.num_students,
      num_groups: body.num_groups,
      num_tas: body.num_tas,
      num_days: body.num_days,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      school_year: body.school_year || "2026/2027",
      tariff: body.tariff || 1,
      price_pp: body.price_pp,
      total,
      custom_notes: body.custom_notes,
      valid_until: body.valid_until || null,
      brochure_program: body.program_type,
      created_by: profile.id,
      status: "draft",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
