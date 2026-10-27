import { createClient } from "@/lib/supabase/server";

export interface BrochureData {
  ueber_uns?: {
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
    callout: string;
  };
  mission?: {
    text: string;
  };
  team?: {
    members: Array<{ name: string; role: string }>;
  };
  native_speaker?: {
    intro: string;
    countries: Array<{ name: string; count: number }>;
    teaching_artists: string[];
  };
  einfluss?: {
    testimonials: Array<{ quote: string; author: string }>;
    stats: Array<{ value: string; label: string }>;
  };
}

/**
 * Fetch editable brochure content from DB.
 * Falls back gracefully — if table doesn't exist or no data, returns empty object.
 */
export async function getBrochureData(): Promise<BrochureData> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offer_brochure_content")
      .select("id, content");

    if (error || !data) return {};

    const result: BrochureData = {};
    for (const row of data) {
      (result as Record<string, unknown>)[row.id] = row.content;
    }
    return result;
  } catch {
    return {};
  }
}
