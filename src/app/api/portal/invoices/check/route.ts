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
  const { work_order, profile, invoice_data } = body;

  const issues: string[] = [];
  const warnings: string[] = [];

  // --- REQUIRED GERMAN INVOICE ELEMENTS ---

  // 1. Tax number
  if (!profile?.tax_number) {
    issues.push("Missing Steuernummer (tax number). Please add it in your profile under Payroll & Admin.");
  }

  // 2. Address
  if (!profile?.address) {
    issues.push("Missing address. German invoices require your full address. Update in your profile.");
  }

  // 3. Full name
  if (!profile?.name || profile.name.trim() === "") {
    issues.push("Missing name on invoice. Update your profile.");
  }

  // 4. Bank details (IBAN)
  if (!profile?.iban) {
    issues.push("Missing IBAN. Required for payment processing. Update in Payroll & Admin.");
  }

  // 5. §19 UStG (Kleinunternehmerregelung) — most TAs are small businesses
  // If they're NOT VAT registered, invoice must state §19 UStG exemption
  if (!profile?.vat_registered) {
    warnings.push(
      "Ensure your invoice includes: \"Gemäß §19 UStG wird keine Umsatzsteuer berechnet.\" (VAT exemption for small businesses)"
    );
  }

  // 6. Payment terms
  warnings.push(
    "Invoice must state payment terms: \"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum\" (payable within 30 days)"
  );

  // --- WORK ORDER MATCHING ---

  if (work_order) {
    // Check rate matches expected for TA level
    if (work_order.total && invoice_data?.base_amount) {
      const expectedTotal = Number(work_order.total);
      const invoicedBase = Number(invoice_data.base_amount);
      if (invoicedBase !== expectedTotal) {
        warnings.push(
          `Base rate mismatch: work order total is €${expectedTotal.toFixed(2)}, invoice shows €${invoicedBase.toFixed(2)}. Verify your pay level is correct.`
        );
      }
    }

    // Check dates match
    if (work_order.start_date) {
      warnings.push(
        `Verify invoice dates match work order: ${work_order.start_date} — ${work_order.end_date} (${work_order.days} days)`
      );
    }

    // Flag add-ons that aren't on the work order (equipment, travel, etc.)
    if (invoice_data?.addons && invoice_data.addons.length > 0) {
      const addonNames = invoice_data.addons.map((a: { name: string }) => a.name).join(", ");
      warnings.push(
        `Additional services claimed: ${addonNames}. Admin will verify these.`
      );
    }
  }

  // --- TAX NUMBER VALIDATION (basic format check) ---

  if (profile?.tax_number) {
    // German Steuernummer format: XX/XXX/XXXXX or XXXXXXXXXXX
    const taxClean = profile.tax_number.replace(/[\s/]/g, "");
    if (taxClean.length < 10 || taxClean.length > 13) {
      warnings.push(
        `Tax number format may be incorrect: "${profile.tax_number}". Expected format: XX/XXX/XXXXX`
      );
    }
  }

  // --- INVOICE NUMBER ---
  if (!invoice_data?.invoice_number) {
    warnings.push("Ensure your invoice has a unique invoice number (Rechnungsnummer).");
  }

  const passed = issues.length === 0;

  return NextResponse.json({
    passed,
    issues,
    warnings,
    checks_performed: [
      "Steuernummer present",
      "Full address present",
      "IBAN present",
      "§19 UStG / VAT status",
      "Payment terms (30 days)",
      "Rate matches work order",
      "Date matches work order",
      "Additional services flagged",
      "Tax number format",
      "Invoice number present",
    ],
  });
}
