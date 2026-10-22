"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminUploadForm } from "./admin-upload-form";
import { StatCard, Badge, Button } from "@/components/ui";

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
  ai_check_passed: boolean | null;
  ai_check_result: {
    passed: boolean;
    issues: string[];
    warnings: string[];
    extracted?: Record<string, unknown>;
  } | null;
  work_order_id: string | null;
  datev_document_id: string | null;
  datev_sent_at: string | null;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string; photo_url: string | null } | null;
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  receipt_url: string | null;
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
  pdf_url: string | null;
  datev_sent_at: string | null;
  needs_review: boolean | null;
  review_reason: string | null;
  beleg_number: string | null;
  created_at: string;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string; photo_url: string | null } | null;
  expense_items: ExpenseItem[];
}

interface AdminUpload {
  id: string;
  filename: string;
  document_type: string;
  description: string | null;
  supplier: string | null;
  amount: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  pdf_url: string | null;
  status: string;
  datev_document_id: string | null;
  datev_sent_at: string | null;
  booked_at: string | null;
  paid_at: string | null;
  created_at: string;
}

type Tab = "all" | "pending" | "approved" | "paid" | "rejected" | "expenses" | "admin-uploads";
type ExpenseFilter = "all" | "flagged";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-neutral-200 text-neutral-800",
  paid: "bg-neutral-900 text-white",
  rejected: "bg-red-50 text-red-700",
};

export function FinancialDashboard({ invoices, expenses, adminUploads }: { invoices: Invoice[]; expenses: Expense[]; adminUploads: AdminUpload[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>("all");

  const pending = invoices.filter((i) => i.status === "submitted");
  const approved = invoices.filter((i) => i.status === "approved");
  const paid = invoices.filter((i) => i.status === "paid");
  const rejected = invoices.filter((i) => i.status === "rejected");

  const flaggedExpenses = expenses.filter((e) => e.needs_review === true);
  const datevSentExpenses = expenses.filter((e) => e.datev_sent_at);

  const totalPending = pending.reduce((s, i) => s + Number(i.total), 0);
  const totalApproved = approved.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = paid.reduce((s, i) => s + Number(i.total), 0);
  const totalFlagged = flaggedExpenses.reduce((s, e) => s + Number(e.total), 0);

  const adminUploadsOutstanding = adminUploads
    .filter((u) => u.status !== "paid")
    .reduce((s, u) => s + Number(u.amount || 0), 0);

  const filteredInvoices = tab === "all" ? invoices
    : tab === "pending" ? pending
    : tab === "approved" ? approved
    : tab === "paid" ? paid
    : tab === "rejected" ? rejected
    : [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <button onClick={() => setTab("pending")} className="text-left">
          <StatCard
            label="TA Pending"
            value={`\u20AC${totalPending.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
            change={`${pending.length} item${pending.length !== 1 ? "s" : ""}`}
          />
        </button>
        <button onClick={() => setTab("approved")} className="text-left">
          <StatCard
            label="Approved"
            value={`\u20AC${totalApproved.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
            change={`${approved.length} item${approved.length !== 1 ? "s" : ""}`}
          />
        </button>
        <button onClick={() => setTab("paid")} className="text-left">
          <StatCard
            label="Paid"
            value={`\u20AC${totalPaid.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
            change={`${paid.length} item${paid.length !== 1 ? "s" : ""}`}
          />
        </button>
        <button onClick={() => { setTab("expenses"); setExpenseFilter("flagged"); }} className="text-left">
          <StatCard
            label="Expenses Flagged"
            value={`\u20AC${totalFlagged.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
            change={`${flaggedExpenses.length} item${flaggedExpenses.length !== 1 ? "s" : ""}`}
          />
        </button>
        <button onClick={() => { setTab("expenses"); setExpenseFilter("all"); }} className="text-left">
          <StatCard
            label="DATEV Sent"
            value={`\u20AC${datevSentExpenses.reduce((s, e) => s + Number(e.total), 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
            change={`${datevSentExpenses.length} item${datevSentExpenses.length !== 1 ? "s" : ""}`}
          />
        </button>
        <button onClick={() => setTab("admin-uploads")} className="text-left">
          <StatCard
            label="Eingangsrechnungen"
            value={`\u20AC${adminUploadsOutstanding.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
            change={`${adminUploads.length} item${adminUploads.length !== 1 ? "s" : ""}`}
          />
        </button>
      </div>

      {/* Tabs — underline style */}
      <div className="flex gap-6 overflow-x-auto border-b border-neutral-200">
        {([
          { id: "all", label: `TA Rechnungen (${invoices.length})` },
          { id: "pending", label: `Pending (${pending.length})` },
          { id: "approved", label: `Approved (${approved.length})` },
          { id: "paid", label: `Paid (${paid.length})` },
          { id: "rejected", label: `Rejected (${rejected.length})` },
          { id: "expenses", label: `TA Auslagen (${expenses.length})` },
          { id: "admin-uploads", label: `Eingangsrechnungen (${adminUploads.length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id !== "expenses") setExpenseFilter("all"); }}
            className={`whitespace-nowrap pb-3 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "admin-uploads" ? (
        <AdminUploadForm />
      ) : tab === "expenses" ? (
        <ExpensesTable expenses={expenses} defaultFilter={expenseFilter} />
      ) : (
        <InvoicesTable invoices={filteredInvoices} />
      )}
    </div>
  );
}

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
        <p className="text-sm text-neutral-500">No invoices in this view.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-neutral-200 bg-white rounded-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Invoice</th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Teaching Artist</th>
            <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-500">Amount</th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Source</th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Date</th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Status</th>
            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">DATEV</th>
            <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {invoices.map((inv) => {
            const ta = inv.profiles;
            const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "\u2014";
            const initials = [ta?.first_name?.[0], ta?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
            const pdfUrl = inv.uploaded_pdf_url || inv.pdf_url;
            const isExpanded = expandedId === inv.id;
            const hasAiDetails = inv.ai_check_result !== null && inv.ai_check_result !== undefined;

            return (
              <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {inv.invoice_number || inv.id.slice(0, 8)}
                    </span>
                    {inv.ai_check_passed === true && (
                      <Badge variant="success">
                        <svg className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        AI Passed
                      </Badge>
                    )}
                    {inv.ai_check_passed === false && (
                      <button onClick={() => setExpandedId(isExpanded ? null : inv.id)}>
                        <Badge variant="error">
                          <svg className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          AI Failed
                        </Badge>
                      </button>
                    )}
                    {inv.ai_check_passed === null && (
                      <Badge variant="default">No check</Badge>
                    )}
                    {pdfUrl && (
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-medium text-neutral-500 underline hover:text-neutral-900">
                        PDF
                      </a>
                    )}
                    {hasAiDetails && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                        className="text-[10px] font-medium text-neutral-500 underline hover:text-neutral-900"
                      >
                        {isExpanded ? "Hide" : "Details"}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/teaching-artists/${ta?.id}`} className="flex items-center gap-2">
                    {ta?.photo_url ? (
                      <img src={ta.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">
                        {initials}
                      </div>
                    )}
                    <span className="text-sm text-neutral-700">{taName}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-semibold tabular-nums text-neutral-900">
                    {"\u20AC"}{Number(inv.total).toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={inv.source === "upload" ? "info" : "default"}>
                    {inv.source === "upload" ? "PDF Upload" : "Calculator"}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-[13px] text-neutral-500">
                  {inv.submitted_at ? new Date(inv.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "\u2014"}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[inv.status] || ""}`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {inv.datev_sent_at ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-900">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {new Date(inv.datev_sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      {inv.datev_document_id && (
                        <span className="inline-flex items-center rounded-sm bg-neutral-100 px-1.5 py-0.5 text-[9px] font-mono text-neutral-500">
                          {inv.datev_document_id}
                        </span>
                      )}
                    </div>
                  ) : inv.status === "submitted" ? (
                    <Badge variant="warning">Pending approval</Badge>
                  ) : (
                    <span className="text-neutral-300">&mdash;</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {loadingId === inv.id ? (
                    <span className="text-xs text-neutral-400">...</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => updateStatus(inv.id, "approved")}
                          >
                            {inv.ai_check_passed === false ? "Approve (AI flagged)" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => updateStatus(inv.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {inv.status === "approved" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateStatus(inv.id, "paid")}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Expanded AI details rows */}
      {invoices.map((inv) => {
        if (expandedId !== inv.id || !inv.ai_check_result) return null;
        const result = inv.ai_check_result;
        return (
          <div key={`ai-${inv.id}`} className="border-t border-neutral-200 bg-white px-5 py-4">
            {inv.ai_check_passed === false && (
              <div className="mb-3 flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-[12px] font-medium text-neutral-700 rounded-sm">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                AI flagged issues -- review before approving
              </div>
            )}
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">AI Validation Details</p>
            {result.issues && result.issues.length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] font-medium text-red-600 mb-1">Issues</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="text-[12px] text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.warnings && result.warnings.length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] font-medium text-amber-700 mb-1">Warnings</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.warnings.map((warning, i) => (
                    <li key={i} className="text-[12px] text-amber-700">{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.passed && (!result.issues || result.issues.length === 0) && (
              <p className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-900">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                All checks passed
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExpensesTable({ expenses, defaultFilter }: { expenses: Expense[]; defaultFilter: ExpenseFilter }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [datevLoadingId, setDatevLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExpenseFilter>(defaultFilter);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const flaggedExpenses = expenses.filter((e) => e.needs_review === true);
  const displayedExpenses = filter === "flagged" ? flaggedExpenses : expenses;

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

  async function sendToDatev(id: string) {
    setDatevLoadingId(id);
    try {
      const res = await fetch(`/api/admin/expenses/${id}/datev`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`DATEV send failed: ${data.error || "Unknown error"}`);
      }
      router.refresh();
    } finally {
      setDatevLoadingId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="border border-dashed border-neutral-300 bg-white p-12 text-center rounded-sm">
        <p className="text-sm text-neutral-500">No expense claims submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sub-filter tabs — underline style */}
      <div className="flex gap-6 border-b border-neutral-200">
        <button
          onClick={() => setFilter("all")}
          className={`whitespace-nowrap pb-2 text-[12px] font-medium transition-colors border-b-2 -mb-px ${
            filter === "all"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          All Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setFilter("flagged")}
          className={`whitespace-nowrap pb-2 text-[12px] font-medium transition-colors border-b-2 -mb-px ${
            filter === "flagged"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Flagged ({flaggedExpenses.length})
        </button>
      </div>

      <div className="overflow-hidden border border-neutral-200 bg-white rounded-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Teaching Artist</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-500">Amount</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Items</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Submitted</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">Status</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-neutral-500">DATEV</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {displayedExpenses.map((exp) => {
              const ta = exp.profiles;
              const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "\u2014";
              const initials = [ta?.first_name?.[0], ta?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
              const items = exp.expense_items || [];
              const categories = [...new Set(items.map((i) => i.category))];
              const isExpanded = expandedId === exp.id;

              return (
                <tr key={exp.id} className="group hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/teaching-artists/${ta?.id}`} className="flex items-center gap-2">
                        {ta?.photo_url ? (
                          <img src={ta.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">
                            {initials}
                          </div>
                        )}
                        <span className="text-sm text-neutral-700">{taName}</span>
                      </Link>
                      {exp.needs_review && (
                        <Badge variant="warning" className="gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          {exp.review_reason || "Flagged"}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-sm font-semibold tabular-nums text-neutral-900">
                      {"\u20AC"}{Number(exp.total).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-neutral-700">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </span>
                      {categories.length > 0 && (
                        <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                          {categories.join(", ")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-neutral-500">
                    {exp.submitted_at ? new Date(exp.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "\u2014"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[exp.status] || ""}`}>
                      {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {exp.datev_sent_at ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-900">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {new Date(exp.datev_sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    ) : exp.needs_review ? (
                      <Badge variant="warning">Pending Review</Badge>
                    ) : (
                      <span className="text-neutral-300">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {loadingId === exp.id || datevLoadingId === exp.id ? (
                      <span className="text-xs text-neutral-400">...</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {exp.pdf_url && (
                          <a href={exp.pdf_url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-medium text-neutral-500 underline hover:text-neutral-900">
                            View PDF
                          </a>
                        )}
                        {items.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                          >
                            {isExpanded ? "Hide" : "Receipts"}
                          </Button>
                        )}
                        {exp.needs_review && !exp.datev_sent_at && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => sendToDatev(exp.id)}
                          >
                            Send to DATEV
                          </Button>
                        )}
                        {exp.status === "submitted" && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => updateStatus(exp.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => updateStatus(exp.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {exp.status === "approved" && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => updateStatus(exp.id, "paid")}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Expanded receipt rows */}
        {displayedExpenses.map((exp) => {
          if (expandedId !== exp.id || !exp.expense_items?.length) return null;
          return (
            <div key={`items-${exp.id}`} className="border-t border-neutral-200 bg-white px-5 py-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Receipts & Items</p>
              <div className="grid gap-2">
                {exp.expense_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border border-neutral-200 bg-white p-3 rounded-sm">
                    {item.receipt_url && (
                      <a href={item.receipt_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                        <img src={item.receipt_url} alt="Receipt" className="h-12 w-12 rounded-sm object-cover border border-neutral-200" />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{item.description}</p>
                      <p className="text-[11px] text-neutral-400">{item.category}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-neutral-900">
                      {"\u20AC"}{Number(item.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
