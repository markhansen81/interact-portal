import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

interface InvoiceExtraction {
  invoice_number: string | null;
  invoice_date: string | null;
  ta_name: string | null;
  ta_address: string | null;
  ta_city: string | null;
  ta_postal_code: string | null;
  ta_tax_number: string | null;
  ta_iban: string | null;
  ta_bic: string | null;
  client_name: string | null;
  client_address: string | null;
  project_dates: string | null;
  project_start_date: string | null;
  project_end_date: string | null;
  line_items: {
    description: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
    type: "instruction" | "travel_stipend" | "equipment" | "material" | "other";
  }[];
  subtotal: number | null;
  total: number | null;
  has_kleinunternehmer_reference: boolean;
  kleinunternehmer_text: string | null;
  has_payment_terms: boolean;
  payment_terms_text: string | null;
  page_count: number;
  ta_level_mentioned: string | null;
  additional_notes: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { file_url, work_order } = body;

  if (!file_url) {
    return NextResponse.json({ error: "file_url is required" }, { status: 400 });
  }

  // Fetch full profile from DB (don't trust client-side data)
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select(
      "id, first_name, last_name, email, street, city, postal_code, tax_number, iban, bic, pay_level, camp_level, vat_registered"
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch work order from DB for cross-referencing
  let workOrderData = null;
  if (work_order?.id) {
    const { data: wo } = await adminClient
      .from("work_orders")
      .select("id, project_name, school, start_date, end_date, days, program_type, daily_rate, total")
      .eq("id", work_order.id)
      .single();
    workOrderData = wo;
  }

  // Fetch pay scales for rate validation
  const { data: payScales } = await adminClient
    .from("pay_scales")
    .select("scale_type, level, level_label, rates")
    .order("scale_type")
    .order("level");

  // Fetch travel stipends for amount validation
  const { data: travelStipends } = await adminClient
    .from("travel_stipends")
    .select("min_hours, max_hours, amount")
    .order("min_hours");

  // --- AI OCR/Extraction ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: basic profile checks only (no AI)
    return NextResponse.json(runBasicChecks(profile, workOrderData));
  }

  let extracted: InvoiceExtraction | null = null;
  try {
    const fileRes = await fetch(file_url);
    const fileBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const contentType = fileRes.headers.get("content-type") || "application/pdf";
    const isPdf = contentType.includes("pdf");

    const client = new Anthropic({ apiKey });
    const content: Anthropic.ContentBlockParam[] = [];

    if (isPdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else {
      let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
      if (contentType.includes("png")) mediaType = "image/png";
      else if (contentType.includes("webp")) mediaType = "image/webp";
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }

    content.push({
      type: "text",
      text: `You are an invoice validator for InterACT English gGmbH. Carefully read this invoice and extract ALL fields. This is a freelancer invoice from a Teaching Artist (TA) for educational services.

Extract the following into JSON (respond with JSON only, no markdown fences):
{
  "invoice_number": "the invoice number / Rechnungsnummer, or null",
  "invoice_date": "YYYY-MM-DD format if found, or null",
  "ta_name": "the name of the invoice issuer (the TA / freelancer), or null",
  "ta_address": "the street address of the TA, or null",
  "ta_city": "city of the TA, or null",
  "ta_postal_code": "postal code of the TA, or null",
  "ta_tax_number": "the Steuernummer / tax number of the TA, or null",
  "ta_iban": "IBAN on the invoice, or null",
  "ta_bic": "BIC/SWIFT on the invoice, or null",
  "client_name": "the name of the client / recipient of the invoice, or null",
  "client_address": "the address of the client / recipient, or null",
  "project_dates": "the project period / Projektzeitraum as written on the invoice, or null",
  "project_start_date": "start date of the project in YYYY-MM-DD, or null",
  "project_end_date": "end date of the project in YYYY-MM-DD, or null",
  "line_items": [
    {
      "description": "line item description",
      "quantity": number or null,
      "unit_price": number or null,
      "total": number or null,
      "type": "instruction" | "travel_stipend" | "equipment" | "material" | "other"
    }
  ],
  "subtotal": number or null,
  "total": number or null (the final total amount),
  "has_kleinunternehmer_reference": true/false (does the invoice mention §19 UStG, Kleinunternehmerregelung, or similar VAT exemption?),
  "kleinunternehmer_text": "the exact text mentioning the VAT exemption, or null",
  "has_payment_terms": true/false (does the invoice state payment terms like 30 Tagen / 30 days?),
  "payment_terms_text": "the exact payment terms text, or null",
  "page_count": number (how many pages is this document?),
  "ta_level_mentioned": "if a level / Stufe is mentioned (e.g. Level 1, Stufe 2), extract it, or null",
  "additional_notes": "any other notable text or observations"
}

Important:
- For line item types: "instruction" = teaching/workshop fees, "travel_stipend" = Fahrtkostenpauschale/travel, "equipment" = Materialkosten/equipment rental, "material" = physical materials purchased, "other" = anything else
- Extract amounts as numbers (e.g. 150.00 not "150,00 €")
- Be thorough — check headers, footers, and fine print for tax references and payment terms`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extracted = null;
    }
  } catch (error) {
    console.error("[INVOICE CHECK] AI extraction failed:", error);
  }

  // --- Validation against profile & work order ---
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!extracted) {
    // AI failed — fall back to basic checks
    const basic = runBasicChecks(profile, workOrderData);
    return NextResponse.json({
      ...basic,
      extracted: null,
      ai_extraction_failed: true,
    });
  }

  // ===== CROSS-REFERENCE WITH TA PROFILE =====

  // 1. Name match
  const profileName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim().toLowerCase();
  if (extracted.ta_name) {
    const invoiceName = extracted.ta_name.toLowerCase();
    if (profileName && !nameMatches(profileName, invoiceName)) {
      issues.push(
        `Name mismatch: invoice shows "${extracted.ta_name}" but profile has "${profile.first_name} ${profile.last_name}".`
      );
    }
  } else {
    issues.push("Could not find the TA's name on the invoice.");
  }

  // 2. Address
  if (!extracted.ta_address && !extracted.ta_city) {
    issues.push("Invoice is missing the TA's address. German invoices require a full address.");
  } else if (profile.street || profile.city) {
    const profileStreet = (profile.street || "").toLowerCase();
    const invoiceAddr = (extracted.ta_address || "").toLowerCase();
    if (profileStreet && invoiceAddr && !invoiceAddr.includes(profileStreet.split(" ")[0])) {
      warnings.push(
        `Address may not match: invoice shows "${extracted.ta_address}" but profile has "${profile.street}".`
      );
    }
    if (profile.postal_code && extracted.ta_postal_code) {
      if (profile.postal_code.replace(/\s/g, "") !== extracted.ta_postal_code.replace(/\s/g, "")) {
        warnings.push(
          `Postal code mismatch: invoice shows "${extracted.ta_postal_code}" but profile has "${profile.postal_code}".`
        );
      }
    }
  }

  // 3. Tax number
  if (!extracted.ta_tax_number) {
    issues.push("Invoice is missing a Steuernummer (tax number). This is required on German invoices.");
  } else if (profile.tax_number) {
    const profileTax = profile.tax_number.replace(/[\s/]/g, "");
    const invoiceTax = extracted.ta_tax_number.replace(/[\s/]/g, "");
    if (profileTax !== invoiceTax) {
      issues.push(
        `Tax number mismatch: invoice shows "${extracted.ta_tax_number}" but profile has "${profile.tax_number}".`
      );
    }
  } else {
    issues.push(
      "Your profile is missing a tax number (Steuernummer). Please add it in Payroll & Admin."
    );
  }

  // 4. IBAN
  if (!extracted.ta_iban) {
    issues.push("Invoice is missing IBAN. Bank details are required for payment.");
  } else if (profile.iban) {
    const profileIban = profile.iban.replace(/\s/g, "").toUpperCase();
    const invoiceIban = extracted.ta_iban.replace(/\s/g, "").toUpperCase();
    if (profileIban !== invoiceIban) {
      issues.push(
        `IBAN mismatch: invoice IBAN does not match your profile IBAN. Update your profile or correct the invoice.`
      );
    }
  } else {
    issues.push("Your profile is missing IBAN. Please add it in Payroll & Admin.");
  }

  // 5. BIC
  if (profile.bic && extracted.ta_bic) {
    const profileBic = profile.bic.replace(/\s/g, "").toUpperCase();
    const invoiceBic = extracted.ta_bic.replace(/\s/g, "").toUpperCase();
    if (profileBic !== invoiceBic) {
      warnings.push(
        `BIC mismatch: invoice shows "${extracted.ta_bic}" but profile has "${profile.bic}".`
      );
    }
  } else if (!extracted.ta_bic && profile.bic) {
    warnings.push("Invoice is missing BIC/SWIFT code. Consider adding it.");
  }

  // ===== CROSS-REFERENCE WITH WORK ORDER =====

  // 6. Client name — must be InterACT English gGmbH
  if (extracted.client_name) {
    const clientLower = extracted.client_name.toLowerCase();
    if (!clientLower.includes("interact") && !clientLower.includes("inter act")) {
      issues.push(
        `Client name should be "InterACT English gGmbH" but invoice shows "${extracted.client_name}".`
      );
    }
  } else {
    issues.push('Invoice is missing the client name. It should be "InterACT English gGmbH".');
  }

  // 7. InterACT address
  if (extracted.client_address) {
    const addrLower = extracted.client_address.toLowerCase();
    if (!addrLower.includes("planufer") || !addrLower.includes("10967")) {
      warnings.push(
        `InterACT address should be "Planufer 92B, 10967 Berlin" but invoice shows "${extracted.client_address}".`
      );
    }
  } else {
    warnings.push(
      'Invoice should include the InterACT address: "Planufer 92B, 10967 Berlin".'
    );
  }

  if (workOrderData) {
    // 8. Project dates
    if (extracted.project_start_date && workOrderData.start_date) {
      if (extracted.project_start_date !== workOrderData.start_date) {
        issues.push(
          `Project start date mismatch: invoice shows ${extracted.project_start_date} but work order has ${workOrderData.start_date}.`
        );
      }
    }
    if (extracted.project_end_date && workOrderData.end_date) {
      if (extracted.project_end_date !== workOrderData.end_date) {
        issues.push(
          `Project end date mismatch: invoice shows ${extracted.project_end_date} but work order has ${workOrderData.end_date}.`
        );
      }
    }
    if (!extracted.project_start_date && !extracted.project_dates) {
      warnings.push("Could not find project dates (Projektzeitraum) on the invoice.");
    }

    // 9. TA Level
    const expectedLevel = workOrderData.program_type?.toLowerCase().includes("camp")
      ? profile.camp_level
      : profile.pay_level;
    if (extracted.ta_level_mentioned) {
      const levelMatch = extracted.ta_level_mentioned.match(/(\d+)/);
      if (levelMatch) {
        const invoiceLevel = parseInt(levelMatch[1]);
        if (invoiceLevel !== expectedLevel) {
          issues.push(
            `Level mismatch: invoice mentions Level ${invoiceLevel} but your profile shows Level ${expectedLevel} for this program type.`
          );
        }
      }
    }

    // 10. Fee amount — check against pay scale rates
    if (extracted.total != null && workOrderData.total != null) {
      // Find instruction fee line item
      const instructionItems = extracted.line_items?.filter(
        (li) => li.type === "instruction"
      ) || [];
      const instructionTotal = instructionItems.reduce(
        (sum, li) => sum + (li.total || 0),
        0
      );

      if (instructionTotal > 0) {
        const expectedTotal = Number(workOrderData.total);
        if (Math.abs(instructionTotal - expectedTotal) > 1) {
          issues.push(
            `Instruction fee mismatch: invoice instruction total is €${instructionTotal.toFixed(2)} but work order total is €${expectedTotal.toFixed(2)}.`
          );
        }
      }

      // Check daily rate against pay scale
      if (payScales && payScales.length > 0 && instructionItems.length > 0) {
        const scaleType = workOrderData.program_type?.toLowerCase().includes("camp")
          ? "camp"
          : "school";
        const matchingScale = payScales.find(
          (ps) => ps.scale_type === scaleType && ps.level === expectedLevel
        );
        if (matchingScale && matchingScale.rates) {
          const expectedRate = matchingScale.rates[workOrderData.program_type] ?? null;
          if (expectedRate != null) {
            for (const item of instructionItems) {
              if (item.unit_price != null && Math.abs(item.unit_price - expectedRate) > 1) {
                warnings.push(
                  `Daily rate appears to be €${item.unit_price.toFixed(2)} but Level ${expectedLevel} rate for ${workOrderData.program_type} is €${expectedRate.toFixed(2)}.`
                );
              }
            }
          }
        }
      }
    }

    // 11. Travel stipend validation
    if (travelStipends && travelStipends.length > 0) {
      const travelItems = extracted.line_items?.filter(
        (li) => li.type === "travel_stipend"
      ) || [];
      if (travelItems.length > 0) {
        const validAmounts = travelStipends.map((ts) => ts.amount);
        const maxStipend = Math.max(...validAmounts);
        for (const item of travelItems) {
          if (item.total != null && item.total > maxStipend * (workOrderData.days || 1) * 1.1) {
            warnings.push(
              `Travel stipend total of €${item.total.toFixed(2)} seems high. Max daily stipend is €${maxStipend.toFixed(2)} x ${workOrderData.days || "?"} days.`
            );
          }
        }
      }
    }
  }

  // ===== REQUIRED LEGAL CLAUSES =====

  // 12. Kleinunternehmerregelung / §19 UStG
  if (!profile.vat_registered) {
    if (!extracted.has_kleinunternehmer_reference) {
      issues.push(
        'Invoice must include a §19 UStG / Kleinunternehmerregelung reference (e.g. "Gemäß §19 UStG wird keine Umsatzsteuer berechnet.").'
      );
    }
  }

  // 13. Payment terms
  if (!extracted.has_payment_terms) {
    warnings.push(
      'Invoice should include payment terms (e.g. "Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum" / payable within 30 days).'
    );
  }

  // ===== STRUCTURAL CHECKS =====

  // 14. No material costs — only services
  const materialItems = extracted.line_items?.filter(
    (li) => li.type === "material"
  ) || [];
  if (materialItems.length > 0) {
    issues.push(
      `Invoice contains material costs (${materialItems.map((m) => m.description).join(", ")}). Only services are allowed (instruction, travel stipend, equipment rental).`
    );
  }

  // 15. Invoice number
  if (!extracted.invoice_number) {
    issues.push(
      "Invoice is missing a unique invoice number (Rechnungsnummer). This is legally required."
    );
  }

  // 16. Invoice date
  if (!extracted.invoice_date) {
    issues.push(
      "Invoice is missing a date (Rechnungsdatum). This is legally required."
    );
  }

  // 17. Page count
  if (extracted.page_count > 2) {
    warnings.push(
      `Invoice is ${extracted.page_count} pages. Invoices should typically be 1 page. Please ensure there is no unnecessary content.`
    );
  }

  const passed = issues.length === 0;

  return NextResponse.json({
    passed,
    issues,
    warnings,
    extracted: {
      invoice_number: extracted.invoice_number,
      total: extracted.total,
      ta_name: extracted.ta_name,
      date: extracted.invoice_date,
      has_address: !!(extracted.ta_address || extracted.ta_city),
      has_tax_number: !!extracted.ta_tax_number,
      has_bank_details: !!extracted.ta_iban,
      line_items: extracted.line_items,
      client_name: extracted.client_name,
      project_dates: extracted.project_dates,
      has_kleinunternehmer: extracted.has_kleinunternehmer_reference,
      has_payment_terms: extracted.has_payment_terms,
      page_count: extracted.page_count,
    },
  });
}

// --- Helpers ---

function nameMatches(profileName: string, invoiceName: string): boolean {
  // Check both orderings (first last, last first)
  const profileParts = profileName.split(/\s+/);
  const invoiceParts = invoiceName.split(/\s+/);

  // All profile name parts should appear somewhere in the invoice name
  const allPartsFound = profileParts.every((part) =>
    invoiceParts.some(
      (ip) => ip === part || ip.includes(part) || part.includes(ip)
    )
  );

  return allPartsFound;
}

function runBasicChecks(
  profile: {
    first_name: string | null;
    last_name: string | null;
    street: string | null;
    city: string | null;
    postal_code: string | null;
    tax_number: string | null;
    iban: string | null;
    bic: string | null;
    vat_registered: boolean | null;
  },
  workOrder: { total: number; start_date: string; end_date: string; days: number } | null
) {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!profile.tax_number) {
    issues.push(
      "Missing Steuernummer (tax number) in your profile. Please add it in Payroll & Admin."
    );
  }
  if (!profile.street && !profile.city) {
    issues.push(
      "Missing address in your profile. German invoices require your full address."
    );
  }
  if (!profile.first_name || !profile.last_name) {
    issues.push("Missing name in your profile.");
  }
  if (!profile.iban) {
    issues.push("Missing IBAN in your profile. Required for payment processing.");
  }
  if (!profile.vat_registered) {
    warnings.push(
      'Ensure your invoice includes: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet."'
    );
  }
  warnings.push(
    "AI invoice check is not configured. Admin will manually verify your invoice."
  );

  if (workOrder) {
    warnings.push(
      `Verify your invoice dates match: ${workOrder.start_date} — ${workOrder.end_date} (${workOrder.days} days)`
    );
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    extracted: null,
  };
}
