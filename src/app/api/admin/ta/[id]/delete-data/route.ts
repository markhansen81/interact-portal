import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { sendSlackAlert } from "@/lib/slack";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Require super admin auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_super_admin")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || !profile.is_super_admin) {
    return NextResponse.json({ error: "Forbidden — super admin required" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Verify target is a TA
  const { data: ta } = await adminClient
    .from("profiles")
    .select("id, email, first_name, last_name, role")
    .eq("id", id)
    .eq("role", "ta")
    .single();

  if (!ta) {
    return NextResponse.json({ error: "TA not found" }, { status: 404 });
  }

  const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;

  // Anonymize profile — replace personal data with [DELETED], keep record structure
  const { error } = await adminClient
    .from("profiles")
    .update({
      first_name: "[DELETED]",
      last_name: "[DELETED]",
      preferred_name: null,
      email: `deleted-${id.slice(0, 8)}@anonymized.local`,
      phone: null,
      address: null,
      street: null,
      city: null,
      postal_code: null,
      country: null,
      date_of_birth: null,
      nationality: null,
      gender: null,
      pronouns: null,
      lgbtqia: null,
      ethnicity: null,
      caretaker_status: null,
      exp_disability_types: null,
      exp_disability_description: null,
      dietary_restrictions: null,
      dietary_options: null,
      iban: null,
      bank_name: null,
      tax_number: null,
      vat_number: null,
      photo_url: null,
      school_photo_url: null,
      bio: null,
      where_from: null,
      hometown_city: null,
      hometown_country: null,
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await logAudit({
    userId: user.id,
    action: "data_deleted",
    targetId: id,
    targetType: "ta_profile",
    details: `GDPR data anonymization for ${taName} (${ta.email}). Performed by super admin ${user.id}.`,
  });

  // Slack alert
  await sendSlackAlert({
    type: "critical",
    title: "TA Data Anonymized (GDPR)",
    message: `TA "${taName}" (${ta.email}) data has been anonymized by super admin.`,
    fields: [
      { label: "TA ID", value: id },
      { label: "Admin", value: user.id },
    ],
  }).catch(() => {});

  return NextResponse.json({ success: true, anonymized: id });
}
