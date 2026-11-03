import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateOfferPDF } from "@/lib/offer-pdf";
import { getProgramContent } from "@/lib/offer-program-content";
import { getBrochureData } from "@/lib/offer-brochure-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !offer)
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const programs: string[] =
    Array.isArray(offer.programs) && offer.programs.length > 0
      ? offer.programs
      : [offer.program_type].filter(Boolean);

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

  const brochureData = await getBrochureData();

  const rawProgramLines = Array.isArray(offer.program_lines) && offer.program_lines.length > 0
    ? offer.program_lines
    : null;

  const pdfProgramLines = rawProgramLines
    ? rawProgramLines.map((l: Record<string, unknown>) => ({
        programType: String(l.program_type || ""),
        numStudents: Number(l.num_students) || offer.num_students || 0,
        numGroups: Number(l.num_groups) || 0,
        numDays: Number(l.num_days) || undefined,
        gradeLevel: l.grade_level ? String(l.grade_level) : undefined,
        pricePP: Number(l.price_pp) || 0,
        total: Number(l.total) || 0,
      }))
    : undefined;

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
    programLines: pdfProgramLines,
    brochureData,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Angebot_${offer.offer_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
