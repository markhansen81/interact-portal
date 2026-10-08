"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const DOCUMENT_TYPES = [
  { value: "eingangsrechnung", label: "Eingangsrechnung (Incoming Invoice)" },
  { value: "ausgangsrechnung", label: "Ausgangsrechnung (Outgoing Invoice)" },
  { value: "beleg", label: "Sonstiger Beleg (Other Receipt)" },
  { value: "vertrag", label: "Vertrag (Contract)" },
  { value: "sonstiges", label: "Sonstiges (Other)" },
] as const;

type Upload = {
  id: string;
  filename: string;
  document_type: string;
  description: string | null;
  supplier: string | null;
  invoice_number: string | null;
  amount: number | null;
  invoice_date: string | null;
  due_date: string | null;
  created_at: string;
  status: string;
};

type FilterTab = "all" | "pending" | "booked" | "paid" | "overdue";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  sent: {
    label: "Sent",
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  },
  booked: {
    label: "Booked",
    className:
      "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  paid: {
    label: "Paid",
    className:
      "bg-green-50 text-green-800 font-bold dark:bg-green-900/30 dark:text-green-300",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  },
};

function isOverdue(u: Upload): boolean {
  if (u.status === "paid") return false;
  if (!u.due_date) return false;
  return new Date(u.due_date) < new Date();
}

function getDisplayStatus(u: Upload): string {
  if (isOverdue(u)) return "overdue";
  return u.status;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function AdminUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("eingangsrechnung");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/upload-invoices");
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const { totalOutstanding, overdueCount, filteredUploads } = useMemo(() => {
    const outstanding = uploads
      .filter((u) => u.status !== "paid")
      .reduce((sum, u) => sum + (u.amount || 0), 0);

    const overdue = uploads.filter((u) => isOverdue(u)).length;

    let filtered = uploads;
    switch (activeFilter) {
      case "pending":
        filtered = uploads.filter(
          (u) => u.status === "sent" && !isOverdue(u)
        );
        break;
      case "booked":
        filtered = uploads.filter((u) => u.status === "booked");
        break;
      case "paid":
        filtered = uploads.filter((u) => u.status === "paid");
        break;
      case "overdue":
        filtered = uploads.filter((u) => isOverdue(u));
        break;
    }

    return {
      totalOutstanding: outstanding,
      overdueCount: overdue,
      filteredUploads: filtered,
    };
  }, [uploads, activeFilter]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
    } else {
      setMessage({ type: "error", text: "Only PDF files are accepted." });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !supplier.trim() || !amount) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      formData.append("description", description);
      formData.append("supplier", supplier.trim());
      if (invoiceNumber.trim())
        formData.append("invoice_number", invoiceNumber.trim());
      formData.append("amount", amount);
      if (invoiceDate) formData.append("invoice_date", invoiceDate);
      if (dueDate) formData.append("due_date", dueDate);

      const res = await fetch("/api/admin/upload-invoices", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      } else {
        setMessage({
          type: "success",
          text: `"${file.name}" sent to DATEV successfully.`,
        });
        setFile(null);
        setDescription("");
        setSupplier("");
        setInvoiceNumber("");
        setAmount("");
        setInvoiceDate("");
        setDueDate("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchUploads();
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/upload-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchUploads();
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const typeLabel = (type: string) =>
    DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "booked", label: "Booked" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
  ];

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";
  const labelClass =
    "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Outstanding
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Total unpaid invoices
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Overdue
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              overdueCount > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {overdueCount}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Past due date &amp; unpaid
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragging
                ? "border-slate-500 bg-slate-50 dark:border-slate-400 dark:bg-slate-900/50"
                : file
                  ? "border-slate-400 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/30"
                  : "border-zinc-300 bg-zinc-50 hover:border-slate-400 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-slate-600"
            }`}
          >
            <svg
              className="mb-3 h-10 w-10 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            {file ? (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {file.name}{" "}
                <span className="text-zinc-400">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Drop a PDF here or click to select
                </p>
                <p className="mt-1 text-xs text-zinc-400">PDF files only</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Document type */}
          <div>
            <label className={labelClass}>Document Type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className={inputClass}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier & Invoice Number */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Supplier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder='e.g. "Amazon", "Telekom", "Landlord"'
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Invoice Number{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Supplier's invoice number"
                className={inputClass}
              />
            </div>
          </div>

          {/* Amount, Invoice Date, Due Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>
                Amount (&euro;) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Invoice Date{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Due Date{" "}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "Office supplies" or "Rent October"'
              className={inputClass}
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || !supplier.trim() || !amount || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {uploading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload &amp; Send to DATEV
              </>
            )}
          </button>
        </div>
      </form>

      {/* Invoices Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Invoices
          </h2>
          {/* Filter Tabs */}
          <div className="mt-3 flex gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === tab.key
                    ? "bg-slate-700 text-white dark:bg-slate-600"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {tab.label}
                {tab.key === "overdue" && overdueCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {overdueCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {filteredUploads.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-400">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredUploads.map((u) => {
                  const displayStatus = getDisplayStatus(u);
                  const badge = STATUS_BADGES[displayStatus] ||
                    STATUS_BADGES["sent"] || {
                      label: u.status,
                      className: "",
                    };

                  return (
                    <tr
                      key={u.id}
                      className="text-zinc-700 dark:text-zinc-300"
                    >
                      <td className="whitespace-nowrap px-6 py-3 font-medium">
                        {u.supplier || "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-500">
                        {u.invoice_number || "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-medium">
                        {u.amount != null ? formatCurrency(u.amount) : "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-500">
                        {u.due_date ? formatDate(u.due_date) : "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-zinc-500">
                        {typeLabel(u.document_type)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <div className="flex gap-2">
                          {u.status !== "booked" && u.status !== "paid" && (
                            <button
                              type="button"
                              disabled={updatingId === u.id}
                              onClick={() =>
                                handleUpdateStatus(u.id, "booked")
                              }
                              className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              Mark Booked
                            </button>
                          )}
                          {u.status !== "paid" && (
                            <button
                              type="button"
                              disabled={updatingId === u.id}
                              onClick={() => handleUpdateStatus(u.id, "paid")}
                              className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
