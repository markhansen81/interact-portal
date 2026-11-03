"use client";

import { useState } from "react";

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

function TAModal({ name, invoices, onClose }: {
  name: string;
  invoices: InvoiceRow[];
  onClose: () => void;
}) {
  const qualifying = invoices
    .filter((r) => (r.days ?? 0) >= 3 && r.level_invoiced)
    .sort((a, b) => (a.invoice_date ?? "").localeCompare(b.invoice_date ?? ""));

  const nonQualifying = invoices
    .filter((r) => (r.days ?? 0) < 3 || !r.level_invoiced)
    .sort((a, b) => (a.invoice_date ?? "").localeCompare(b.invoice_date ?? ""));

  const currentLevel = qualifying.length > 0 ? calcLevel(qualifying.length) : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-12 px-4 pb-4" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{name}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              {qualifying.length} qualifying project{qualifying.length !== 1 ? "s" : ""}
              {" · "}current level should be{" "}
              <span className="font-semibold text-neutral-800">{currentLevel}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {/* Qualifying */}
          {qualifying.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-100">
                <tr className="text-xs text-neutral-400 uppercase tracking-wide">
                  <th className="text-left px-6 py-2 font-medium w-24">Calc. Level</th>
                  <th className="text-left px-6 py-2 font-medium">Project</th>
                  <th className="text-right px-6 py-2 font-medium w-16">Days</th>
                  <th className="text-right px-6 py-2 font-medium w-28">Amount</th>
                  <th className="text-right px-6 py-2 font-medium w-28">Invoiced Level</th>
                  <th className="text-right px-6 py-2 font-medium w-14">PDF</th>
                </tr>
              </thead>
              <tbody>
                {qualifying.map((inv, idx) => {
                  const calcLvl = calcLevel(idx + 1);
                  const invLvl = inv.level_invoiced ? parseFloat(inv.level_invoiced) : null;
                  const mismatch = invLvl != null && String(inv.level_invoiced) !== calcLvl;

                  return (
                    <tr key={idx} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50">
                      <td className="px-6 py-3 font-mono font-semibold text-neutral-700">{calcLvl}</td>
                      <td className="px-6 py-3">
                        <p className="text-neutral-800">{inv.project_name ?? "—"}</p>
                        {inv.school && <p className="text-xs text-neutral-400">{inv.school}</p>}
                        {inv.invoice_date && <p className="text-xs text-neutral-400">{inv.invoice_date}</p>}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium text-neutral-800">{inv.days ?? "—"}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-neutral-600">
                        {inv.total_amount != null
                          ? `€${Number(inv.total_amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {invLvl != null ? (
                          <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-sm ${
                            mismatch ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                          }`}>
                            {inv.level_invoiced}{mismatch && <span className="ml-1">{invLvl > parseFloat(calcLvl) ? "↑" : "↓"}</span>}
                          </span>
                        ) : <span className="text-neutral-300">—</span>}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {inv.pdf_url
                          ? <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs underline">PDF</a>
                          : <span className="text-neutral-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Non-qualifying */}
          {nonQualifying.length > 0 && (
            <div className="border-t border-amber-100 bg-amber-50/40">
              <div className="px-6 py-2 border-b border-amber-100">
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  Not counted — {nonQualifying.length} row{nonQualifying.length !== 1 ? "s" : ""} (&lt;3 days or no level)
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {nonQualifying.map((inv, idx) => (
                    <tr key={idx} className="border-b border-amber-50 last:border-0 text-neutral-500">
                      <td className="px-6 py-2 w-24 text-amber-600 font-medium tabular-nums">{inv.days != null ? `${inv.days}d` : "—"}</td>
                      <td className="px-6 py-2">
                        <p>{inv.project_name ?? <span className="text-neutral-300">—</span>}</p>
                        {inv.school && <p className="text-xs text-neutral-400">{inv.school}</p>}
                        {inv.invoice_date && <p className="text-xs text-neutral-400">{inv.invoice_date}</p>}
                      </td>
                      <td className="px-6 py-2 text-right tabular-nums">
                        {inv.total_amount != null ? `€${Number(inv.total_amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-6 py-2 text-right font-mono text-neutral-400">{inv.level_invoiced ?? "—"}</td>
                      <td className="px-6 py-2 text-right">
                        {inv.pdf_url
                          ? <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs underline">PDF</a>
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LevelsTable({ byTA, taNames }: {
  byTA: Record<string, InvoiceRow[]>;
  taNames: string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="bg-white border border-neutral-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-neutral-400 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50">
              <th className="text-left px-6 py-3 font-medium">Teaching Artist</th>
              <th className="text-right px-6 py-3 font-medium w-36">Qualifying Projects</th>
              <th className="text-right px-6 py-3 font-medium w-36">Current Level</th>
              <th className="text-right px-6 py-3 font-medium w-36">First Invoice</th>
              <th className="text-right px-6 py-3 font-medium w-36">Last Invoice</th>
            </tr>
          </thead>
          <tbody>
            {taNames.map((name) => {
              const invoices = byTA[name];
              const qualifying = invoices.filter((r) => (r.days ?? 0) >= 3 && r.level_invoiced);
              const sorted = [...invoices].sort((a, b) => (a.invoice_date ?? "").localeCompare(b.invoice_date ?? ""));
              const level = qualifying.length > 0 ? calcLevel(qualifying.length) : "—";
              const hasMismatch = qualifying.some((inv, idx) => {
                const calc = calcLevel(idx + 1);
                return inv.level_invoiced && String(inv.level_invoiced) !== calc;
              });

              return (
                <tr
                  key={name}
                  className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => setSelected(name)}
                >
                  <td className="px-6 py-3 font-medium text-neutral-800">
                    {name}
                    {hasMismatch && <span className="ml-2 text-xs text-red-500">⚠ level mismatch</span>}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-neutral-600">{qualifying.length}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-mono font-semibold text-neutral-800">{level}</span>
                  </td>
                  <td className="px-6 py-3 text-right text-neutral-400 text-xs">{sorted[0]?.invoice_date ?? "—"}</td>
                  <td className="px-6 py-3 text-right text-neutral-400 text-xs">{sorted[sorted.length - 1]?.invoice_date ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <TAModal
          name={selected}
          invoices={byTA[selected]}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
