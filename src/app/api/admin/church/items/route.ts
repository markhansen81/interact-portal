import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const profile = await requireAuth(["admin"]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const [churchResult, leadsResult] = await Promise.all([
    supabase
      .from("church_items")
      .select(
        "id, name, school_name, source, deal_stage, opp_status, program_type, " +
        "num_students, num_groups, num_days, num_tas, price_pp, grade_level, " +
        "city, state, street, contact_email, teacher_contact, start_date, end_date, updated_at"
      )
      .in("source", ["opportunity", "project"])
      .order("updated_at", { ascending: false }),

    supabase
      .from("leads")
      .select(
        "id, school_name, first_name, last_name, email, phone, " +
        "programs, num_students, num_groups, city, state, street, postcode, created_at"
      )
      .not("school_name", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  // Normalise leads into the same shape as church_items
  const leads = ((leadsResult.data || []) as any[]).map((l) => ({
    id: l.id,
    name: l.school_name,
    school_name: l.school_name,
    source: "lead" as const,
    deal_stage: null,
    opp_status: null,
    program_type: Array.isArray(l.programs) ? (l.programs[0] as string | null) : null,
    programs: l.programs,
    num_students: l.num_students ? parseInt(l.num_students, 10) || null : null,
    num_groups: l.num_groups ? parseInt(l.num_groups as string, 10) || null : null,
    num_days: null,
    num_tas: null,
    price_pp: null,
    grade_level: null,
    city: l.city,
    state: l.state,
    street: l.street,
    postcode: l.postcode,
    contact_email: l.email,
    teacher_contact: [l.first_name, l.last_name].filter(Boolean).join(" ") || null,
    start_date: null,
    end_date: null,
    // extra fields for offer pre-fill
    lead_id: l.id,
  }));

  const churchItems = churchResult.data || [];

  return NextResponse.json({ items: [...churchItems, ...leads] });
}
