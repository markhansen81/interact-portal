import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OfferForm } from "@/components/admin/offer-form";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditOfferPage({ params }: Props) {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const { id } = await params;
  const supabase = await createClient();

  const { data: offer, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !offer) redirect("/admin/offers");

  // Fetch rates for auto-lookup
  const { data: rates } = await supabase
    .from("offer_rates")
    .select("*")
    .order("program_type")
    .order("num_days", { ascending: true });

  // Map offer data to form shape
  const prefill = {
    school_name: offer.school_name,
    contact_name: offer.contact_name,
    contact_email: offer.contact_email,
    school_address: offer.school_address,
    city: offer.city,
    postcode: offer.postcode,
    state: offer.state,
    program_type: offer.program_type,
    programs: offer.programs || [offer.program_type].filter(Boolean),
    grade_level: offer.grade_level,
    num_students: offer.num_students ?? "",
    num_groups: offer.num_groups ?? "",
    num_tas: offer.num_tas ?? "",
    num_days: offer.num_days ?? "",
    start_date: offer.start_date || "",
    end_date: offer.end_date || "",
    school_year: offer.school_year || "2026/2027",
    tariff: offer.tariff || 1,
    price_pp: offer.price_pp ?? "",
    valid_until: offer.valid_until || "",
    notes: offer.custom_notes || "",
    lead_id: offer.lead_id,
    church_item_id: offer.church_item_id,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${offer.offer_number}`}
        description={offer.school_name}
        action={
          <Link
            href={`/admin/offers/${id}`}
            className="text-sm text-neutral-400 hover:text-neutral-900"
          >
            Cancel
          </Link>
        }
      />
      <OfferForm prefill={prefill} rates={rates || []} offerId={id} />
    </div>
  );
}
