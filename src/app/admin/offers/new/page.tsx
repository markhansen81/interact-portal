import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OfferForm } from "@/components/admin/offer-form";

interface Props {
  searchParams: Promise<{ lead_id?: string; church_item_id?: string }>;
}

export default async function NewOfferPage({ searchParams }: Props) {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const params = await searchParams;
  const supabase = await createClient();

  // Fetch rates
  const { data: rates } = await supabase
    .from("offer_rates")
    .select("*")
    .order("program_type")
    .order("num_days", { ascending: true });

  // Prefill from lead or church_item
  let prefill: Record<string, unknown> = {};

  if (params.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.lead_id)
      .single();

    if (lead) {
      const leadPrograms = Array.isArray(lead.programs) ? lead.programs : [];
      prefill = {
        school_name: lead.school_name || lead.name,
        contact_name: [lead.first_name, lead.last_name].filter(Boolean).join(" "),
        contact_email: lead.email,
        school_address: lead.street,
        city: lead.city,
        postcode: lead.postcode,
        state: lead.state,
        programs: leadPrograms,
        program_type: leadPrograms[0] || "",
        num_students: lead.num_students ? Number(lead.num_students) : "",
        num_groups: lead.num_groups ? Number(lead.num_groups) : "",
        lead_id: lead.id,
      };
    }
  }

  if (params.church_item_id) {
    const { data: item } = await supabase
      .from("church_items")
      .select("*")
      .eq("id", params.church_item_id)
      .single();

    if (item) {
      const itemPrograms = item.program_type ? [item.program_type] : [];
      prefill = {
        school_name: item.school_name || item.name,
        contact_name: item.teacher_contact,
        contact_email: item.contact_email,
        school_address: item.street,
        city: item.city,
        state: item.state,
        program_type: item.program_type,
        programs: itemPrograms,
        num_students: item.num_students,
        num_groups: item.num_groups,
        num_tas: item.num_tas,
        num_days: item.num_days,
        grade_level: item.grade_level,
        price_pp: item.price_pp,
        start_date: item.start_date,
        end_date: item.end_date,
        church_item_id: item.id,
      };
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900">Create Offer</h2>
      <OfferForm prefill={prefill} rates={rates || []} />
    </div>
  );
}
