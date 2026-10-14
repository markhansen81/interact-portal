import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { sendSlackAlert } from "@/lib/slack";

export async function PATCH(
  request: Request,
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const adminClient = createAdminClient();

  const updates: Record<string, unknown> = { status: body.status };

  if (body.status === "approved") {
    updates.approved_at = new Date().toISOString();
  } else if (body.status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { data: claim, error } = await adminClient
    .from("expense_claims")
    .update(updates)
    .eq("id", id)
    .select("*, profiles!expense_claims_ta_id_fkey(id, first_name, last_name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ta = claim.profiles as { id: string; first_name: string; last_name: string; email: string };
  const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;

  // Slack alert when high-value expense is flagged for review
  if (body.status === "flagged" || (claim.needs_review && Number(claim.total) > 100)) {
    await sendSlackAlert({
      type: "warning",
      title: "Expense flagged for review",
      message: `Expense claim from ${taName} requires manual review`,
      fields: [
        { label: "Amount", value: `EUR${Number(claim.total).toFixed(2)}` },
        { label: "TA", value: taName },
      ],
    }).catch(() => {});
  }

  await notify({
    userId: ta.id,
    type: `expense_${body.status}`,
    title: `Expense claim ${body.status}`,
    body: `Your expense claim has been ${body.status}.`,
  });

  return NextResponse.json({ success: true });
}
