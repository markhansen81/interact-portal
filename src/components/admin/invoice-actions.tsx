"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InvoiceActions({
  id,
  status,
  type,
}: {
  id: string;
  status: string;
  type: "invoice" | "expense";
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function updateStatus(newStatus: string) {
    setLoading(true);
    const endpoint =
      type === "invoice"
        ? `/api/admin/invoices/${id}`
        : `/api/admin/expenses/${id}`;

    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    setLoading(false);
    router.refresh();
  }

  if (loading) {
    return <span className="text-xs text-zinc-400">...</span>;
  }

  return (
    <div className="flex gap-1 justify-end">
      {status === "submitted" && (
        <>
          <button
            onClick={() => updateStatus("approved")}
            className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
          >
            Approve
          </button>
          <button
            onClick={() => updateStatus("rejected")}
            className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            Reject
          </button>
        </>
      )}
      {status === "approved" && (
        <button
          onClick={() => updateStatus("paid")}
          className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
        >
          Mark Paid
        </button>
      )}
      {(status === "paid" || status === "rejected") && (
        <span className="text-xs text-zinc-400">—</span>
      )}
    </div>
  );
}
