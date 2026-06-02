import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = [
  // Section 1 - Contact
  "first_name", "last_name", "preferred_name", "phone", "address",
  "street", "city", "postal_code", "country",
  "date_of_birth", "nationality", "gender", "pronouns", "lgbtqia",
  "ethnicity", "caretaker_status", "phone_consent",
  // Section 2 - About
  "where_from", "hometown_city", "hometown_country", "moved_to_germany", "moved_to_germany_year", "likes_germany", "vacation_spot",
  "great_at", "not_great_at", "art_type", "superpower", "comic_title",
  "famous_last_words", "favourite_food", "bio",
  // Section 3 - Qualifications
  "education_level", "certifications", "art_profession", "tefl_status",
  "german_level", "german_professional",
  // Section 4 - Experience
  "exp_grades_1_4", "exp_grades_5_7", "exp_grades_8_plus",
  "exp_disabilities", "exp_disability_types", "exp_disability_description",
  // Section 6 - Logistics
  "dietary_restrictions", "dietary_options", "homestay_willing", "lifeguard_cert",
  "drivers_licence", "bahncard", "bahncard_expiry", "deutschlandticket",
  // Section 7 - Payroll
  "iban", "bank_name", "tax_number", "vat_number", "vat_registered",
  // Meta
  "photo_url", "school_photo_url", "onboarding_sections_complete", "onboarding_status",
];

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create review task when onboarding status changes to ready
    if (updates.onboarding_status === "ready") {
      const { data: ta } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      const taName = ta ? `${ta.first_name} ${ta.last_name}` : "A TA";

      await supabase.from("admin_review_tasks").insert({
        type: "profile_complete",
        ta_id: user.id,
        reference_id: "onboarding",
        title: "Onboarding completed",
        description: `${taName} has completed their onboarding profile. Review their details.`,
      });
    }
  }

  // Handle program preferences (stored in separate table)
  if (body.program_preferences && typeof body.program_preferences === "object") {
    const prefs = body.program_preferences as Record<string, string>;

    // Delete existing preferences
    await supabase
      .from("ta_program_preferences")
      .delete()
      .eq("ta_id", user.id);

    // Insert new ones (only non-empty values)
    const rows = Object.entries(prefs)
      .filter(([, v]) => v && v.length > 0)
      .map(([program_type, preference]) => ({
        ta_id: user.id,
        program_type,
        preference,
      }));

    if (rows.length > 0) {
      const { error: prefError } = await supabase
        .from("ta_program_preferences")
        .insert(rows);

      if (prefError) {
        return NextResponse.json({ error: prefError.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
