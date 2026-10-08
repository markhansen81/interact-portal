import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Generate invoice number: INV-YYYY-XXXX
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", user.id);

  const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`;

  // Create invoice
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      ta_id: user.id,
      work_order_id: body.work_order_id,
      invoice_number: invoiceNumber,
      base_amount: body.base_amount,
      addons_total: body.addons_total,
      total: body.total,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      notes: body.notes || null,
      source: body.source || "calculator",
      uploaded_pdf_url: body.uploaded_pdf_url || null,
      ai_check_result: body.ai_check_result || null,
      ai_check_passed: body.ai_check_passed ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Create invoice addon line items
  if (body.addons && body.addons.length > 0) {
    const addonRows = body.addons.map(
      (addon: { service_id: string; name: string; fee: number; quantity: number; total: number }) => ({
        invoice_id: invoice.id,
        service_id: addon.service_id || null,
        name: addon.name,
        fee_snapshot: addon.fee,
        quantity: addon.quantity,
        total: addon.total,
      })
    );

    await supabase.from("invoice_addons").insert(addonRows);
  }

  // Generate PDF for calculator-submitted invoices
  const source = body.source || "calculator";
  let generatedPdfUrl: string | null = null;

  if (source === "calculator") {
    try {
      const adminClient = createAdminClient();

      // Fetch full TA profile
      const { data: taProfile } = await adminClient
        .from("profiles")
        .select(
          "id, first_name, last_name, street, city, postal_code, email, phone, tax_number, vat_registered, iban, bic, bank_name, pay_level, camp_level"
        )
        .eq("id", user.id)
        .single();

      // Fetch work order details
      const { data: wo } = await adminClient
        .from("work_orders")
        .select("project_name, school, program_type, start_date, end_date, days")
        .eq("id", body.work_order_id)
        .single();

      if (taProfile && wo) {
        const isCamp = wo.program_type?.toLowerCase().includes("camp");
        const level = isCamp ? taProfile.camp_level : taProfile.pay_level;

        // Build line items: base pay first, then addons
        const lineItems: Array<{ description: string; amount: number }> = [
          {
            description: `Instruction fee (Level ${level}, ${wo.days}d)`,
            amount: Number(body.base_amount),
          },
        ];

        if (body.addons && body.addons.length > 0) {
          for (const addon of body.addons) {
            lineItems.push({
              description: addon.name,
              amount: Number(addon.total),
            });
          }
        }

        const pdfBuffer = await generateInvoicePDF({
          invoiceNumber,
          invoiceDate: new Date().toISOString().slice(0, 10),
          taProfile: {
            id: taProfile.id,
            first_name: taProfile.first_name || "",
            last_name: taProfile.last_name || "",
            street: taProfile.street,
            city: taProfile.city,
            postal_code: taProfile.postal_code,
            email: taProfile.email || "",
            phone: taProfile.phone,
            tax_number: taProfile.tax_number,
            vat_registered: taProfile.vat_registered,
            iban: taProfile.iban,
            bic: taProfile.bic,
            bank_name: taProfile.bank_name,
            pay_level: taProfile.pay_level,
            camp_level: taProfile.camp_level,
          },
          workOrder: {
            project_name: wo.project_name,
            school: wo.school,
            program_type: wo.program_type,
            start_date: wo.start_date,
            end_date: wo.end_date,
            days: wo.days,
          },
          lineItems,
          total: Number(body.total),
        });

        // Upload PDF to Supabase storage
        const storagePath = `invoices/${invoice.id}.pdf`;
        const { error: uploadError } = await adminClient.storage
          .from("documents")
          .upload(storagePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = adminClient.storage.from("documents").getPublicUrl(storagePath);

          generatedPdfUrl = publicUrl;

          // Update invoice record with PDF URL
          await supabase
            .from("invoices")
            .update({ pdf_url: publicUrl })
            .eq("id", invoice.id);
        } else {
          console.error("[INVOICE PDF] Upload failed:", uploadError.message);
        }
      }
    } catch (e) {
      console.error("[INVOICE PDF] Generation failed:", e);
    }
  }

  // Push to Monday immediately on submission
  if (process.env.MONDAY_API_TOKEN) {
    try {
      const adminClient = createAdminClient();

      // Get TA profile
      const { data: ta } = await adminClient
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      // Get work order program type
      let programType = null;
      if (body.work_order_id) {
        const { data: wo } = await adminClient
          .from("work_orders")
          .select("program_type")
          .eq("id", body.work_order_id)
          .single();
        programType = wo?.program_type || null;
      }

      const taName = ta
        ? `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email
        : "Unknown TA";

      const { pushInvoiceToMonday } = await import("@/lib/monday");
      await pushInvoiceToMonday({
        invoiceNumber,
        taName,
        taEmail: ta?.email || "",
        amount: Number(body.total),
        workOrderId: body.work_order_id,
        pdfUrl: body.uploaded_pdf_url || generatedPdfUrl || null,
        programType,
        aiIssues: body.ai_check_result?.issues || null,
      });
    } catch (e) {
      console.error("[MONDAY] Failed to push invoice:", e);
    }
  }

  return NextResponse.json({ success: true, invoice });
}
