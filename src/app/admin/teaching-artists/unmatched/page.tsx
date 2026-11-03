import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

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

function calcLevel(n: number): string {
  if (n === 1) return "1";
  if (n <= 5)  return `2.${n - 1}`;
  if (n <= 10) return `3.${n - 5}`;
  if (n <= 20) return `4.${n - 10}`;
  return "5";
}

export default async function UnmatchedInvoicesPage() {
  const supabase = await createClient();

  // Deduplicate by (ta_name_raw, pdf_filename) — same PDF sent in multiple emails
  const { data: raw } = await supabase
    .from("ta_invoice_history")
    .select("ta_name_raw, invoice_date, project_name, school, days, level_invoiced, total_amount, pdf_url, pdf_filename")
    .is("ta_id", null)
    .not("ta_name_raw", "is", null)
    .order("ta_name_raw")
    .order("invoice_date");

  // Deduplicate: keep one row per (ta_name_raw, pdf_filename)
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
        title="Invoice History — Not in Portal"
        description={`${taNames.length} TAs · ${deduped.length} invoices scanned from email`}
        action={
          <Link
            href="/admin/teaching-artists"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            ← Teaching Artists
          </Link>
        }
      />

      {taNames.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
          <p className="text-neutral-500">No unmatched invoice records yet.</p>
          <p className="mt-1 text-sm text-neutral-400">Run the invoice scanner to populate this.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {taNames.map((name) => {
            const all = byTA[name];

            // Qualifying = 3+ days and has a level on the invoice (i.e. project work)
            const qualifying = all
              .filter((r) => (r.days ?? 0) >= 3 && r.level_invoiced)
              .sort((a, b) => (a.invoice_date ?? "").localeCompare(b.invoice_date ?? ""));

            // Non-qualifying rows (travel, pickup, short stints)
            const nonQualifying = all.filter(
              (r) => (r.days ?? 0) < 3 || !r.level_invoiced
            ).sort((a, b) => (a.invoice_date ?? "").localeCompare(b.invoice_date ?? ""));

            return (
              <div key={name} className="bg-white border border-neutral-200 rounded-sm overflow-hidden">
                {/* TA name bar */}
                <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                  <span className="font-semibold text-neutral-900">{name}</span>
                  <span className="text-xs text-neutral-400">
                    {qualifying.length} qualifying project{qualifying.length !== 1 ? "s" : ""}
                    {" · "}current level should be{" "}
                    <span className="font-medium text-neutral-700">
                      {qualifying.length > 0 ? calcLevel(qualifying.length) : "—"}
                    </span>
                  </span>
                </div>

                {/* Qualifying projects table */}
                {qualifying.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-neutral-400 uppercase tracking-wide bg-neutral-50 border-b border-neutral-100">
                        <th className="text-left px-5 py-2 font-medium w-20">Calc. Level</th>
                        <th className="text-left px-5 py-2 font-medium">Project</th>
                        <th className="text-right px-5 py-2 font-medium w-16">Days</th>
                        <th className="text-right px-5 py-2 font-medium w-28">Amount</th>
                        <th className="text-right px-5 py-2 font-medium w-24">Invoiced Level</th>
                        <th className="text-right px-5 py-2 font-medium w-16">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qualifying.map((inv, idx) => {
                        const calcLvl = calcLevel(idx + 1);
                        const invoicedLvl = inv.level_invoiced ? parseFloat(inv.level_invoiced) : null;
                        const mismatch = invoicedLvl != null && invoicedLvl !== parseFloat(calcLvl);

                        return (
                          <tr key={idx} className="border-b border-neutral-50 last:border-0">
                            <td className="px-5 py-2.5 font-mono font-semibold text-neutral-700">
                              {calcLvl}
                            </td>
                            <td className="px-5 py-2.5">
                              <p className="text-neutral-800">{inv.project_name ?? "—"}</p>
                              {inv.school && (
                                <p className="text-xs text-neutral-400">{inv.school}</p>
                              )}
                              {inv.invoice_date && (
                                <p className="text-xs text-neutral-400">{inv.invoice_date}</p>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums font-medium text-neutral-800">
                              {inv.days ?? "—"}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums text-neutral-600">
                              {inv.total_amount != null
                                ? `€${Number(inv.total_amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                                : "—"}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              {invoicedLvl != null ? (
                                <span
                                  className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-sm ${
                                    mismatch
                                      ? "bg-red-50 text-red-700"
                                      : "bg-green-50 text-green-700"
                                  }`}
                                >
                                  {inv.level_invoiced}
                                  {mismatch && (
                                    <span className="ml-1 text-xs">
                                      {invoicedLvl > parseFloat(calcLvl) ? "↑" : "↓"}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-neutral-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              {inv.pdf_url ? (
                                <a
                                  href={inv.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                                >
                                  PDF
                                </a>
                              ) : (
                                <span className="text-neutral-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Non-qualifying rows (collapsed, faded) */}
                {nonQualifying.length > 0 && (
                  <div className="border-t border-neutral-100 px-5 py-2">
                    <p className="text-xs text-neutral-400 mb-1">
                      {nonQualifying.length} non-qualifying (travel / &lt;3 days / no level):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nonQualifying.map((inv, idx) => (
                        <span key={idx} className="text-xs text-neutral-400">
                          {inv.invoice_date ?? "?"}{" "}
                          {inv.project_name ? `· ${inv.project_name.slice(0, 30)}` : ""}
                          {inv.pdf_url && (
                            <>
                              {" "}
                              <a
                                href={inv.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 underline"
                              >
                                PDF
                              </a>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
