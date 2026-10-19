"use client";

import { useState } from "react";

interface InsuranceOrder {
  id: string;
  squarespace_order_id: string;
  order_number: string | null;
  customer_email: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  insured_first_name: string | null;
  insured_last_name: string | null;
  school_name: string | null;
  project_date: string | null;
  participation_fee: number | null;
  num_project_days: number | null;
  product_name: string | null;
  total: number;
  currency: string;
  invoice_pdf_url: string | null;
  email_sent_at: string | null;
  created_at: string;
}

type DeliveryStatus = "delivered" | "failed" | "processing";

function getDeliveryStatus(order: InsuranceOrder): DeliveryStatus {
  if (order.email_sent_at) return "delivered";
  const ageMs = Date.now() - new Date(order.created_at).getTime();
  const fiveMinutes = 5 * 60 * 1000;
  return ageMs > fiveMinutes ? "failed" : "processing";
}

function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  switch (status) {
    case "delivered":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
          Delivered
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
          Failed
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Processing
        </span>
      );
  }
}

function ResendButton({
  orderId,
  onSuccess,
}: {
  orderId: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/insurance-orders/${orderId}/resend`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Resend failed");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleResend}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
      >
        {loading ? (
          <svg
            className="h-3 w-3 animate-spin"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        Resend
      </button>
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}

export function InsuranceOrdersTable({ orders: initialOrders }: { orders: InsuranceOrder[] }) {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState(initialOrders);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(s) ||
      o.customer_email.toLowerCase().includes(s) ||
      o.customer_first_name?.toLowerCase().includes(s) ||
      o.customer_last_name?.toLowerCase().includes(s) ||
      o.insured_first_name?.toLowerCase().includes(s) ||
      o.insured_last_name?.toLowerCase().includes(s) ||
      o.school_name?.toLowerCase().includes(s)
    );
  });

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const failedCount = orders.filter((o) => getDeliveryStatus(o) === "failed").length;
  const lastOrder = orders.length > 0 ? orders[0] : null; // orders are sorted desc by created_at

  function markDelivered(orderId: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, email_sent_at: new Date().toISOString() } : o
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Total Orders</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {orders.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Total Revenue</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            &euro;{totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Emails Sent</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {orders.filter((o) => o.email_sent_at).length}
          </p>
        </div>
        {failedCount > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
            <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {failedCount}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-900/10">
            <p className="text-sm text-green-600 dark:text-green-400">Failed</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              0
            </p>
          </div>
        )}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Last Order</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {lastOrder
              ? new Date(lastOrder.created_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name, email, school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-zinc-200 px-4 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Order #
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Insured Person
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                School
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Project Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Days
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Fee
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Total
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                PDF
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Delivery
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  {search ? "No matching orders" : "No insurance orders yet"}
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const status = getDeliveryStatus(order);
                return (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-50 hover:bg-zinc-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {order.order_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {new Date(order.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-900 dark:text-zinc-50">
                        {[order.customer_first_name, order.customer_last_name]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {order.customer_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      {[order.insured_first_name, order.insured_last_name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {order.school_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {order.project_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {order.num_project_days ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {order.participation_fee != null
                        ? `\u20AC${Number(order.participation_fee).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      &euro;{Number(order.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {order.invoice_pdf_url ? (
                        <a
                          href={order.invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                          No PDF
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <ResendButton
                        orderId={order.id}
                        onSuccess={() => markDelivered(order.id)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
