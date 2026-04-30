"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface WorkOrder {
  id: string;
  project_name: string;
  program_type: string;
  start_date: string;
}

interface ExpenseItem {
  description: string;
  amount: string;
  receiptFile: File | null;
}

export function ExpenseClaimForm({
  workOrders,
}: {
  workOrders: WorkOrder[];
}) {
  const router = useRouter();
  const [selectedWO, setSelectedWO] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([
    { description: "", amount: "", receiptFile: null },
  ]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const total = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  function addItem() {
    setItems([...items, { description: "", amount: "", receiptFile: null }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ExpenseItem, value: string | File | null) {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
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
          receipt_url,
        };
      })
    );

    const res = await fetch("/api/portal/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        work_order_id: selectedWO || null,
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <Link href="/portal/expenses" className="text-sm text-zinc-500 hover:text-zinc-700">
        &larr; Back
      </Link>

      {/* Work Order (optional) */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Related work order (optional)
        </label>
        <select
          value={selectedWO}
          onChange={(e) => setSelectedWO(e.target.value)}
          className="input"
        >
          <option value="">None / General</option>
          {workOrders.map((wo) => (
            <option key={wo.id} value={wo.id}>
              {wo.project_name} — {wo.start_date}
            </option>
          ))}
        </select>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Expense Items
        </h3>
        <div className="mt-4 space-y-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Description
                    </label>
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      required
                      className="input"
                      placeholder="e.g. Train ticket Berlin → Halle"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">
                        Amount (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(i, "amount", e.target.value)}
                        required
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">
                        Receipt
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          updateItem(i, "receiptFile", e.target.files?.[0] || null)
                        }
                        className="block w-full text-xs text-zinc-500 file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:text-zinc-700"
                      />
                    </div>
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="mt-6 text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400"
        >
          + Add Item
        </button>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          rows={2}
        />
      </div>

      {/* Total & Submit */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            €{total.toFixed(2)}
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || total === 0}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Submitting..." : "Submit Claim"}
        </button>
      </div>
    </form>
  );
}
