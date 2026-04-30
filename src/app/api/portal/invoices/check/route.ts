import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { work_order, profile } = body;

  // For now, run rule-based checks
  // TODO: Integrate actual AI (Claude API) to read the PDF and extract/validate fields
  const issues: string[] = [];
  const warnings: string[] = [];
  const extracted = {
    invoice_number: null,
    total: work_order?.total || null,
    ta_name: profile?.name || null,
    date: new Date().toISOString().split("T")[0],
    has_address: !!profile?.address,
    has_tax_number: false, // TODO: check from profile
    has_bank_details: false, // TODO: check from profile
  };

  // Check required German invoice fields
  if (!profile?.address) {
    issues.push("Your address is missing from your profile. German invoices require a full address.");
  }

  if (!profile?.name || profile.name.trim() === "") {
    issues.push("Your name is missing. Please update your profile.");
  }

  // Check rate matches expected
  if (work_order?.total) {
    warnings.push(
      `Expected total based on work order: €${Number(work_order.total).toFixed(2)}. Make sure your invoice matches.`
    );
  }

  // General reminders
  warnings.push("Ensure your invoice includes: Steuernummer (tax number), IBAN, and bank name.");
  warnings.push("All remuneration includes VAT as per your contract.");

  const passed = issues.length === 0;

  return NextResponse.json({
    passed,
    issues,
    warnings,
    extracted,
  });
}
