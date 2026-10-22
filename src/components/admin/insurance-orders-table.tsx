"use client";

import { useState } from "react";
import { StatCard, Badge, Button } from "@/components/ui";

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
  const variants: Record<DeliveryStatus, "success" | "error" | "warning"> = {
    delivered: "success",
    failed: "error",
    processing: "warning",
  };
  const labels: Record<DeliveryStatus, string> = {
    delivered: "Delivered",
    failed: "Failed",
    processing: "Processing",
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
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
      <Button
        variant="danger"
        size="sm"
        onClick={handleResend}
        disabled={loading}
      >
        {loading ? (
          <svg
            className="h-3 w-3 animate-spin mr-1"
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
      </Button>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
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
        <StatCard label="Total Orders" value={orders.length} />
        <StatCard label="Total Revenue" value={`\u20AC${totalRevenue.toFixed(2)}`} />
        <StatCard label="Emails Sent" value={orders.filter((o) => o.email_sent_at).length} />
        <StatCard
          label="Failed"
          value={failedCount}
          change={failedCount > 0 ? `${failedCount} need attention` : "All clear"}
        />
        <StatCard
          label="Last Order"
          value={
            lastOrder
              ? new Date(lastOrder.created_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "-"
          }
        />
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name, email, school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-neutral-300 bg-white rounded-sm px-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-0 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-200 bg-white rounded-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Order #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Insured Person
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                School
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Project Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Fee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                PDF
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Delivery
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-8 text-center text-neutral-400"
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
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {order.order_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {new Date(order.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-900">
                        {[order.customer_first_name, order.customer_last_name]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {order.customer_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-900">
                      {[order.insured_first_name, order.insured_last_name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {order.school_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {order.project_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {order.num_project_days ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {order.participation_fee != null
                        ? `\u20AC${Number(order.participation_fee).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      &euro;{Number(order.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {order.invoice_pdf_url ? (
                        <a
                          href={order.invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neutral-900 underline hover:text-neutral-600"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-red-600">
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
