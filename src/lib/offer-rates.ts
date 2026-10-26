import { createClient } from "@/lib/supabase/server";

export async function getOfferRate(programType: string, numDays: number, schoolYear?: string) {
  const supabase = await createClient();
  const year = schoolYear || "2026/2027";
  const { data } = await supabase
    .from("offer_rates")
    .select("*")
    .eq("program_type", programType)
    .eq("num_days", numDays)
    .eq("school_year", year)
    .eq("active", true)
    .single();
  return data;
}

export async function getAllRates(schoolYear?: string) {
  const supabase = await createClient();
  const year = schoolYear || "2026/2027";
  const { data } = await supabase
    .from("offer_rates")
    .select("*")
    .eq("school_year", year)
    .eq("active", true)
    .order("sort_order");
  return data || [];
}
