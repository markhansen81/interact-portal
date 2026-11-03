import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { LevelsTable } from "@/components/admin/levels-table";

type InvoiceRow = {
  ta_name_raw: string;
  invoice_date: string | null;
  project_name: string | null;
  school: string | null;
  days: number | null;
  level_invoiced: string | null;
  total_amount: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
};

export default async function LevelsPage() {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("ta_invoice_history")
    .select("ta_name_raw, invoice_date, project_name, school, days, level_invoiced, total_amount, pdf_url, pdf_filename")
    .is("ta_id", null)
    .not("ta_name_raw", "is", null)
    .order("ta_name_raw")
    .order("invoice_date");

  // Deduplicate by (ta_name_raw, pdf_filename)
  const seen = new Set<string>();
  const deduped = (raw || []).filter((row) => {
    const key = `${row.ta_name_raw}||${row.pdf_filename}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as InvoiceRow[];

  // Group by TA
  const byTA: Record<string, InvoiceRow[]> = {};
  deduped.forEach((row) => {
    const name = row.ta_name_raw!;
    if (!byTA[name]) byTA[name] = [];
    byTA[name].push(row);
  });

  const taNames = Object.keys(byTA).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Levels"
        description={`${taNames.length} TAs · ${deduped.length} invoices scanned`}
      />
      <LevelsTable byTA={byTA} taNames={taNames} />
    </div>
  );
}
