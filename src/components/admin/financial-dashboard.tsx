"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Invoice {
  id: string;
  ta_id: string;
  invoice_number: string | null;
  total: number;
  status: string;
  source: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  uploaded_pdf_url: string | null;
  pdf_url: string | null;
  created_at: string;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string; photo_url: string | null } | null;
}

interface Expense {
  id: string;
  ta_id: string;
  total: number;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string; photo_url: string | null } | null;
}

type Tab = "all" | "pending" | "approved" | "paid" | "rejected" | "expenses";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  submitted: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  approved: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  paid: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export function FinancialDashboard({ invoices, expenses }: { invoices: Invoice[]; expenses: Expense[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const pending = invoices.filter((i) => i.status === "submitted");
  const approved = invoices.filter((i) => i.status === "approved");
  const paid = invoices.filter((i) => i.status === "paid");
  const rejected = invoices.filter((i) => i.status === "rejected");

  const totalPending = pending.reduce((s, i) => s + Number(i.total), 0);
  const totalApproved = approved.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = paid.reduce((s, i) => s + Number(i.total), 0);
  const totalExpensesPending = expenses.filter((e) => e.status === "submitted").reduce((s, e) => s + Number(e.total), 0);

  const filteredInvoices = tab === "all" ? invoices
    : tab === "pending" ? pending
    : tab === "approved" ? approved
    : tab === "paid" ? paid
    : tab === "rejected" ? rejected
    : [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Pending Review" value={totalPending} count={pending.length} color="amber" onClick={() => setTab("pending")} />
        <SummaryCard label="Approved" value={totalApproved} count={approved.length} color="blue" onClick={() => setTab("approved")} />
        <SummaryCard label="Paid" value={totalPaid} count={paid.length} color="green" onClick={() => setTab("paid")} />
        <SummaryCard label="Expenses Pending" value={totalExpensesPending} count={expenses.filter((e) => e.status === "submitted").length} color="purple" onClick={() => setTab("expenses")} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-200/80 bg-zinc-100/50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {([
          { id: "all", label: `All Invoices (${invoices.length})` },
          { id: "pending", label: `Pending (${pending.length})` },
          { id: "approved", label: `Approved (${approved.length})` },
          { id: "paid", label: `Paid (${paid.length})` },
          { id: "rejected", label: `Rejected (${rejected.length})` },
          { id: "expenses", label: `Expenses (${expenses.length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition-all ${
              tab === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "expenses" ? (
        <ExpensesTable expenses={expenses} />
      ) : (
        <InvoicesTable invoices={filteredInvoices} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, count, color, onClick }: {
  label: string; value: number; count: number; color: string; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10",
    blue: "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10",
    green: "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10",
    purple: "border-purple-200 bg-purple-50 dark:border-purple-900/40 dark:bg-purple-900/10",
  };
  const textColors: Record<string, string> = {
    amber: "text-amber-700 dark:text-amber-400",
    blue: "text-blue-700 dark:text-blue-400",
    green: "text-green-700 dark:text-green-400",
    purple: "text-purple-700 dark:text-purple-400",
  };

  return (
    <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition-all hover:shadow-sm ${colors[color]}`}>
      <p className="text-[13px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${textColors[color]}`}>
        {"\u20AC"}{value.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
      </p>
      <p className="mt-0.5 text-xs text-zinc-400">{count} item{count !== 1 ? "s" : ""}</p>
    </button>
  );
}

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setLoadingId(id);
    await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoadingId(null);
    router.refresh();
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">No invoices in this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Invoice</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Teaching Artist</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Amount</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Source</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Date</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {invoices.map((inv) => {
            const ta = inv.profiles;
            const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—";
            const initials = [ta?.first_name?.[0], ta?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
            const pdfUrl = inv.uploaded_pdf_url || inv.pdf_url;

            return (
              <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {inv.invoice_number || inv.id.slice(0, 8)}
                    </span>
                    {pdfUrl && (
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800">
                        PDF
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/teaching-artists/${ta?.id}`} className="flex items-center gap-2">
                    {ta?.photo_url ? (
                      <img src={ta.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">
                        {initials}
                      </div>
                    )}
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{taName}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {"\u20AC"}{Number(inv.total).toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    inv.source === "upload" ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}>
                    {inv.source === "upload" ? "PDF Upload" : "Calculator"}
                  </span>
                </td>
                <td className="px-5 py-3 text-[13px] text-zinc-500">
                  {inv.submitted_at ? new Date(inv.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[inv.status] || ""}`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {loadingId === inv.id ? (
                    <span className="text-xs text-zinc-400">...</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === "submitted" && (
                        <>
                          <button onClick={() => updateStatus(inv.id, "approved")}
                            className="rounded-lg bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(inv.id, "rejected")}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800">
                            Reject
                          </button>
                        </>
                      )}
                      {inv.status === "approved" && (
                        <button onClick={() => updateStatus(inv.id, "paid")}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700">
                          Mark Paid
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setLoadingId(id);
    await fetch(`/api/admin/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoadingId(null);
    router.refresh();
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">No expense claims submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Teaching Artist</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Amount</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Submitted</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Notes</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Status</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {expenses.map((exp) => {
            const ta = exp.profiles;
            const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—";
            const initials = [ta?.first_name?.[0], ta?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";

            return (
              <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                <td className="px-5 py-3">
                  <Link href={`/admin/teaching-artists/${ta?.id}`} className="flex items-center gap-2">
                    {ta?.photo_url ? (
                      <img src={ta.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">
                        {initials}
                      </div>
                    )}
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{taName}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {"\u20AC"}{Number(exp.total).toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3 text-[13px] text-zinc-500">
                  {exp.submitted_at ? new Date(exp.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                </td>
                <td className="px-5 py-3 text-[13px] text-zinc-500 max-w-[200px] truncate">
                  {exp.notes || "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[exp.status] || ""}`}>
                    {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {loadingId === exp.id ? (
                    <span className="text-xs text-zinc-400">...</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {exp.status === "submitted" && (
                        <>
                          <button onClick={() => updateStatus(exp.id, "approved")}
                            className="rounded-lg bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(exp.id, "rejected")}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800">
                            Reject
                          </button>
                        </>
                      )}
                      {exp.status === "approved" && (
                        <button onClick={() => updateStatus(exp.id, "paid")}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700">
                          Mark Paid
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
