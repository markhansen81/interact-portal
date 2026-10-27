import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOfferPDF } from "@/lib/offer-pdf";
import { getProgramContent } from "@/lib/offer-program-content";
import { sendEmail, offerEmail } from "@/lib/email";

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

  // Get rate for both tariffs
  const { data: rate } = await supabase
    .from("offer_rates")
    .select("tariff_1, tariff_2")
    .eq("program_type", offer.program_type)
    .eq("num_days", offer.num_days || 5)
    .eq("school_year", offer.school_year || "2026/2027")
    .eq("active", true)
    .single();

  // Collect program contents for all selected programs
  const programs: string[] = Array.isArray(offer.programs) && offer.programs.length > 0
    ? offer.programs
    : [offer.program_type].filter(Boolean);

  const allProgramContents = programs
    .map((p: string) => getProgramContent(p))
    .filter(Boolean) as import("@/lib/offer-program-content").ProgramContent[];

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
    programType: offer.program_type,
    startDate: offer.start_date,
    endDate: offer.end_date,
    numStudents: offer.num_students || 0,
    numGroups: offer.num_groups || 0,
    numTas: offer.num_tas || 0,
    tariff: (offer.tariff || 1) as 1 | 2,
    pricePPTariff1: rate?.tariff_1 || offer.price_pp || 0,
    pricePPTariff2: rate?.tariff_2 || null,
    total: offer.total || 0,
    allProgramContents,
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

  return NextResponse.json({ ok: emailResult.ok, pdf_url: pdfUrl });
}
