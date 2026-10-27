import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * POST: Pull latest data from the linked church_item into this offer.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  // Fetch offer
  const { data: offer } = await supabase
    .from("offers")
    .select("church_item_id")
    .eq("id", id)
    .single();

  if (!offer?.church_item_id)
    return NextResponse.json({ error: "No linked CRM item" }, { status: 400 });

  // Fetch church_item
  const { data: item } = await supabase
    .from("church_items")
    .select("*")
    .eq("id", offer.church_item_id)
    .single();

  if (!item)
    return NextResponse.json({ error: "CRM item not found" }, { status: 404 });

  // Map CRM fields to offer fields
  const updates: Record<string, unknown> = {
    school_name: item.school_name || item.name,
    contact_email: item.contact_email || undefined,
    school_address: item.street || undefined,
    city: item.city || undefined,
    state: item.state || undefined,
    num_students: item.num_students || undefined,
    num_groups: item.num_groups || undefined,
    num_tas: item.num_tas || undefined,
    num_days: item.num_days || undefined,
    start_date: item.start_date || undefined,
    end_date: item.end_date || undefined,
    grade_level: item.grade_level || undefined,
    updated_at: new Date().toISOString(),
  };

  // Update program_type if CRM has it
  if (item.program_type) {
    updates.program_type = item.program_type;
    // Add to programs array if not already there
    const { data: currentOffer } = await supabase
      .from("offers")
      .select("programs")
      .eq("id", id)
      .single();
    const programs = currentOffer?.programs || [];
    if (!programs.includes(item.program_type)) {
      updates.programs = [...programs, item.program_type];
    }
  }

  // Recalculate total if students or price changed
  if (updates.num_students) {
    const { data: currentOffer } = await supabase
      .from("offers")
      .select("price_pp")
      .eq("id", id)
      .single();
    if (currentOffer?.price_pp) {
      updates.total = Number(currentOffer.price_pp) * Number(updates.num_students);
    }
  }

  // Remove undefined values
  for (const key of Object.keys(updates)) {
    if (updates[key] === undefined) delete updates[key];
  }

  const { error } = await supabase.from("offers").update(updates).eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: Object.keys(updates) });
}
