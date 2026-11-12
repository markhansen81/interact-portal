import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Allow updating rates and level_label only
  const update: Record<string, unknown> = {};
  if (body.rates !== undefined) update.rates = body.rates;
  if (body.level_label !== undefined) update.level_label = String(body.level_label);
  if (body.min_projects !== undefined) update.min_projects = body.min_projects === "" ? null : Number(body.min_projects);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("pay_scales")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
