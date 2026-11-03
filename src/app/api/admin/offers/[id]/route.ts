import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();

  // Recalculate total: prefer sum of program_lines, fall back to flat fields
  let total: number | null = null;
  if (Array.isArray(body.program_lines) && body.program_lines.length > 0) {
    total = body.program_lines.reduce((sum: number, l: Record<string, unknown>) => {
      const pp = Number(l.price_pp) || 0;
      const stu = Number(l.num_students) || 0;
      return sum + pp * stu;
    }, 0) || null;
  } else if (body.price_pp != null && body.num_students != null) {
    total = Number(body.price_pp) * Number(body.num_students);
  } else {
    total = body.total ?? null;
  }

  const updates: Record<string, unknown> = {
    ...body,
    total,
    program_type: body.programs?.[0] || body.program_type,
    updated_at: new Date().toISOString(),
  };

  // Don't overwrite offer_number or id
  delete updates.id;
  delete updates.offer_number;

  // Remap notes → custom_notes (form field name vs DB column name)
  if ("notes" in updates) {
    updates.custom_notes = updates.notes;
    delete updates.notes;
  }

  const { data, error } = await supabase
    .from("offers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
