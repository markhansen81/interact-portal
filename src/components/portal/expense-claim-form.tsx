"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface WorkOrder {
  id: string;
  project_name: string;
  program_type: string;
  start_date: string;
}

const CATEGORIES = [
  { value: "materialien", label: "Materialien (Supplies)" },
  { value: "lebensmittel", label: "Lebensmittel (Food)" },
  { value: "transport", label: "Transport (Travel/Transit)" },
  { value: "unterkunft", label: "Unterkunft (Accommodation)" },
  { value: "druck", label: "Druck/Kopien (Printing)" },
  { value: "sonstiges", label: "Sonstiges (Other)" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface ExpenseItem {
  description: string;
  amount: string;
  category: Category | "";
  work_order_id: string;
  receiptFile: File | null;
  receiptPreview: string | null;
}

function emptyItem(): ExpenseItem {
  return {
    description: "",
    amount: "",
    category: "",
    work_order_id: "",
    receiptFile: null,
    receiptPreview: null,
  };
}

export function ExpenseClaimForm({
  workOrders,
}: {
  workOrders: WorkOrder[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ExpenseItem[]>([emptyItem()]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const total = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  function addItem() {
    setItems([...items, emptyItem()]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  }

  function updateItem(
    index: number,
    field: keyof ExpenseItem,
    value: string | File | null
  ) {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function handleFileChange(index: number, file: File | null) {
    if (!file) {
      updateItem(index, "receiptFile", null);
      updateItem(index, "receiptPreview", null);
      return;
    }
    updateItem(index, "receiptFile", file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, receiptPreview: reader.result as string } : item
        )
      );
    };
    reader.readAsDataURL(file);
  }

  function clearReceipt(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, receiptFile: null, receiptPreview: null }
          : item
      )
    );
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    // Upload receipts
    const uploadedItems = await Promise.all(
      items.map(async (item) => {
        let receipt_url = null;
        if (item.receiptFile) {
          const fileName = `receipts/${Date.now()}-${item.receiptFile.name}`;
          const { data } = await supabase.storage
            .from("documents")
            .upload(fileName, item.receiptFile);
          if (data) {
            const { data: urlData } = supabase.storage
              .from("documents")
              .getPublicUrl(data.path);
            receipt_url = urlData.publicUrl;
          }
        }
        return {
          description: item.description,
          amount: parseFloat(item.amount) || 0,
          category: item.category,
          work_order_id: item.work_order_id || null,
          receipt_url,
        };
      })
    );

    const res = await fetch("/api/portal/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: uploadedItems,
        total,
        notes,
      }),
    });

    if (res.ok) {
      router.push("/portal/expenses");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4 pb-28">
      {/* Back link */}
      <Link
        href="/portal/expenses"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Receipt Items */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 px-1">
          Receipts
        </h3>

        {items.map((item, i) => (
          <div
            key={i}
            className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Remove button */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                aria-label="Remove item"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="space-y-3">
              {/* 1. Photo / Receipt Upload */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Receipt Photo
                </label>
                {item.receiptPreview ? (
                  <div className="relative inline-block">
                    <Image
                      src={item.receiptPreview}
                      alt="Receipt preview"
                      width={160}
                      height={160}
                      className="h-32 w-32 rounded-xl border border-zinc-200 object-cover dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => clearReceipt(i)}
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
                      aria-label="Remove photo"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[i]?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 px-4 py-5 text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    Take Photo / Upload
                  </button>
                )}
                <input
                  ref={(el) => { fileInputRefs.current[i] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(i, e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              {/* 2. Category */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Category *
                </label>
                <select
                  value={item.category}
                  onChange={(e) => updateItem(i, "category", e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Project */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Project
                </label>
                <select
                  value={item.work_order_id}
                  onChange={(e) => updateItem(i, "work_order_id", e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">General / No project</option>
                  {workOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.project_name} — {wo.start_date}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Description *
                </label>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g. Train ticket Berlin → Halle"
                />
              </div>

              {/* 5. Amount */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Amount (EUR) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-zinc-400">
                    &euro;
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={item.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-9 pr-4 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Receipt button */}
        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 active:bg-amber-200 dark:border-amber-600 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Receipt
        </button>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="Any extra info..."
        />
      </div>

      {/* Sticky Total + Submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-200 bg-white/95 backdrop-blur-md dark:border-amber-800 dark:bg-zinc-900/95 sm:static sm:rounded-2xl sm:border sm:border-amber-200 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 sm:px-0">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              &euro;{total.toFixed(2)}
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || total === 0}
            className="rounded-xl bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 sm:px-8"
          >
            {loading ? "Submitting..." : "Submit Claim"}
          </button>
        </div>
      </div>
    </form>
  );
}
