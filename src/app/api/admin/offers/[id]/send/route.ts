import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOfferPDF } from "@/lib/offer-pdf";
import { getProgramContent } from "@/lib/offer-program-content";
import { getBrochureData } from "@/lib/offer-brochure-data";
import { sendEmail, offerEmail } from "@/lib/email";
import { mondayQuery } from "@/lib/monday";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Fetch offer
  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !offer)
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (!offer.contact_email)
    return NextResponse.json({ error: "No contact email" }, { status: 400 });

  // Collect programs
  const programs: string[] = Array.isArray(offer.programs) && offer.programs.length > 0
    ? offer.programs
    : [offer.program_type].filter(Boolean);

  // Get rates for ALL programs
  const { data: allRates } = await supabase
    .from("offer_rates")
    .select("program_type, tariff_1, tariff_2")
    .in("program_type", programs)
    .eq("num_days", offer.num_days || 5)
    .eq("school_year", offer.school_year || "2026/2027")
    .eq("active", true);

  const programRates = programs.map((p: string) => {
    const r = allRates?.find((rate) => rate.program_type === p);
    return {
      programType: p,
      tariff1: r?.tariff_1 || offer.price_pp || 0,
      tariff2: r?.tariff_2 || null,
    };
  });

  const allProgramContents = programs
    .map((p: string) => getProgramContent(p))
    .filter(Boolean) as import("@/lib/offer-program-content").ProgramContent[];

  // Fetch editable brochure content from DB (falls back to hardcoded if no data)
  const brochureData = await getBrochureData();

  // Generate PDF
  const pdfBuffer = await generateOfferPDF({
    offerNumber: offer.offer_number,
    offerDate: new Date().toISOString().split("T")[0],
    validUntil: offer.valid_until,
    schoolName: offer.school_name,
    schoolAddress: [
      offer.school_address,
      [offer.postcode, offer.city].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", "),
    contactName: offer.contact_name || "",
    programType: programs.join(" + "),
    startDate: offer.start_date,
    endDate: offer.end_date,
    numStudents: offer.num_students || 0,
    numGroups: offer.num_groups || 0,
    numTas: offer.num_tas || 0,
    tariff: (offer.tariff || 1) as 1 | 2,
    pricePPTariff1: programRates[0]?.tariff1 || offer.price_pp || 0,
    pricePPTariff2: programRates[0]?.tariff2 || null,
    total: offer.total || 0,
    allProgramContents,
    programRates,
    brochureData,
  });

  // Upload PDF to Supabase Storage
  const fileName = `offers/${offer.offer_number}.pdf`;
  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  let pdfUrl = null;
  if (!uploadError) {
    const { data: urlData } = adminClient.storage
      .from("documents")
      .getPublicUrl(fileName);
    pdfUrl = urlData.publicUrl;
  }

  // Look up salesperson (offer creator) to CC
  let ccEmail: string | undefined;
  if (offer.created_by) {
    const { data: creator } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", offer.created_by)
      .single();
    ccEmail = creator?.email || undefined;
  }

  // Send email
  const emailContent = offerEmail({
    contactName: offer.contact_name || "",
    schoolName: offer.school_name,
    offerNumber: offer.offer_number,
    numStudents: offer.num_students || 0,
    numGroups: offer.num_groups || 0,
    numTas: offer.num_tas || 0,
  });

  const emailResult = await sendEmail({
    to: offer.contact_email,
    cc: ccEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    attachments: [
      { filename: `Angebot_${offer.offer_number}.pdf`, content: pdfBuffer },
    ],
  });

  // Update offer status
  await supabase
    .from("offers")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Post update to Monday CRM item (fire and forget — non-blocking)
  postMondayUpdate({ offer, pdfUrl, programs, adminClient }).catch((e) =>
    console.error("[OFFER SEND] Monday update failed:", e)
  );

  return NextResponse.json({ ok: emailResult.ok, pdf_url: pdfUrl });
}

async function postMondayUpdate({
  offer,
  pdfUrl,
  programs,
  adminClient,
}: {
  offer: Record<string, any>;
  pdfUrl: string | null;
  programs: string[];
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
}) {
  // Find the Monday item ID — prefer lead, fall back to church_item opp/project
  let mondayItemId: string | null = null;

  if (offer.lead_id) {
    const { data: lead } = await adminClient
      .from("leads")
      .select("monday_item_id")
      .eq("id", offer.lead_id)
      .single();
    mondayItemId = lead?.monday_item_id || null;
  }

  if (!mondayItemId && offer.church_item_id) {
    const { data: item } = await adminClient
      .from("church_items")
      .select("monday_opp_id, monday_project_id")
      .eq("id", offer.church_item_id)
      .single();
    mondayItemId = item?.monday_project_id || item?.monday_opp_id || null;
  }

  if (!mondayItemId) return;

  const lines: string[] = [
    `📄 **Angebot gesendet: ${offer.offer_number}**`,
    ``,
    `Schule: ${offer.school_name || "—"}`,
    `An: ${offer.contact_name || "—"} <${offer.contact_email || "—"}>`,
    `Programm: ${programs.join(", ") || "—"}`,
    `Schüler: ${offer.num_students || "—"} | Gruppen: ${offer.num_groups || "—"} | Tage: ${offer.num_days || "—"}`,
    offer.total ? `Gesamtbetrag: €${Number(offer.total).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : "",
    ``,
    pdfUrl ? `📎 PDF: ${pdfUrl}` : "",
    ``,
    `Gesendet über das InterACT Portal`,
  ].filter((l) => l !== undefined);

  const body = lines.join("\n").trim();

  await mondayQuery(
    `mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }`,
    { itemId: mondayItemId, body }
  );
}
