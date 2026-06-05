import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Only allow updating specific fields
  const allowedFields = [
    "first_name",
    "last_name",
    "preferred_name",
    "phone",
    "address",
    "category",
    "pay_level",
    "training_online",
    "training_offline",
    "is_active",
    "onboarding_status",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
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

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  try {
    // Delete related records first (foreign key constraints)
    await adminClient.from("admin_review_tasks").delete().eq("ta_id", id);

    // Delete invoice_addons for this TA's invoices, then invoices
    const { data: invoices } = await adminClient
      .from("invoices")
      .select("id")
      .eq("ta_id", id);
    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((inv) => inv.id);
      await adminClient.from("invoice_addons").delete().in("invoice_id", invoiceIds);
    }
    await adminClient.from("invoices").delete().eq("ta_id", id);

    // Delete expense_items for this TA's expense_claims, then expense_claims
    const { data: claims } = await adminClient
      .from("expense_claims")
      .select("id")
      .eq("ta_id", id);
    if (claims && claims.length > 0) {
      const claimIds = claims.map((c) => c.id);
      await adminClient.from("expense_items").delete().in("expense_claim_id", claimIds);
    }
    await adminClient.from("expense_claims").delete().eq("ta_id", id);

    await adminClient.from("work_orders").delete().eq("ta_id", id);
    await adminClient.from("documents").delete().eq("ta_id", id);
    await adminClient.from("ta_program_preferences").delete().eq("ta_id", id);
    await adminClient.from("availability").delete().eq("ta_id", id);
    await adminClient.from("notifications").delete().eq("user_id", id);
    await adminClient.from("messages").delete().eq("from_user_id", id);
    await adminClient.from("messages").delete().eq("to_user_id", id);
    await adminClient.from("activity_log").delete().eq("ta_id", id);

    // Delete profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Delete auth user
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete teaching artist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
