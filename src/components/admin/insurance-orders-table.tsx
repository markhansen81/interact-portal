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

function RepairBanner({ affectedCount, onRepaired }: { affectedCount: number; onRepaired: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRepair() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/insurance-orders/repair", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Repair failed");
      setDone(true);
      onRepaired();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        ✓ Repair complete — corrected PDFs resent to all affected customers.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-red-800">
          {affectedCount} order{affectedCount !== 1 ? "s" : ""} with wrong participation fee (€12,900 instead of €129)
        </p>
        <p className="text-xs text-red-600 mt-0.5">
          Caused by a number parsing bug (now fixed). Click to correct the data, regenerate PDFs, and resend to customers.
        </p>
        {error && <p className="text-xs text-red-700 mt-1 font-medium">{error}</p>}
      </div>
      <button
        onClick={handleRepair}
        disabled={loading}
        className="shrink-0 rounded-sm bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? "Repairing…" : "Fix & Resend All"}
      </button>
    </div>
  );
}

const DELIVERY_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed" },
  { key: "processing", label: "Processing" },
];

export function InsuranceOrdersTable({ orders: initialOrders }: { orders: InsuranceOrder[] }) {
  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [orders, setOrders] = useState(initialOrders);

  const afterSearch = orders.filter((o) => {
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

  const filtered = deliveryFilter === "all"
    ? afterSearch
    : afterSearch.filter((o) => getDeliveryStatus(o) === deliveryFilter);

  const deliveryCounts = DELIVERY_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f.key] = f.key === "all" ? afterSearch.length : afterSearch.filter((o) => getDeliveryStatus(o) === f.key).length;
    return acc;
  }, {});

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const failedCount = orders.filter((o) => getDeliveryStatus(o) === "failed").length;
  const lastOrder = orders.length > 0 ? orders[0] : null; // orders are sorted desc by created_at
  const affectedOrders = orders.filter((o) => Number(o.participation_fee) === 12900).length;

  function markDelivered(orderId: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, email_sent_at: new Date().toISOString() } : o
      )
    );
  }

  function markAllRepaired() {
    setOrders((prev) =>
      prev.map((o) =>
        Number(o.participation_fee) === 12900
          ? { ...o, participation_fee: 129, email_sent_at: new Date().toISOString() }
          : o
      )
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 divide-x divide-neutral-200 lg:grid-cols-5 border-b border-neutral-200 pb-8">
        <div><StatCard label="Total Orders" value={orders.length} /></div>
        <div className="pl-6"><StatCard label="Total Revenue" value={`\u20AC${totalRevenue.toFixed(2)}`} /></div>
        <div className="pl-6"><StatCard label="Emails Sent" value={orders.filter((o) => o.email_sent_at).length} /></div>
        <div className="pl-6">
          <StatCard
            label="Failed"
            value={failedCount}
            change={failedCount > 0 ? `${failedCount} need attention` : "All clear"}
          />
        </div>
        <div className="pl-6">
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
      </div>

      {/* Repair banner for corrupted orders */}
      {affectedOrders > 0 && (
        <RepairBanner affectedCount={affectedOrders} onRepaired={markAllRepaired} />
      )}

      {/* Search + Delivery filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm border border-neutral-300 bg-white rounded-sm py-2 pl-8 pr-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-1 rounded-sm bg-neutral-100 p-1 self-start">
          {DELIVERY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDeliveryFilter(f.key)}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                deliveryFilter === f.key ? "bg-white text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {f.label}
              <span className="ml-1 text-neutral-400">{deliveryCounts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Order #
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Date
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Customer
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Insured Person
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                School
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Project Date
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Days
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Fee
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Total
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                PDF
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Delivery
              </th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="py-12 text-center text-neutral-400"
                >
                  {search || deliveryFilter !== "all" ? "No matching orders" : "No insurance orders yet"}
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
                    <td className="py-4 pr-6 font-medium text-neutral-900">
                      {order.order_number || "-"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {new Date(order.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="text-neutral-900">
                        {[order.customer_first_name, order.customer_last_name]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {order.customer_email}
                      </div>
                    </td>
                    <td className="py-4 pr-6 text-neutral-900">
                      {[order.insured_first_name, order.insured_last_name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {order.school_name || "-"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {order.project_date || "-"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {order.num_project_days ?? "-"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {order.participation_fee != null
                        ? `\u20AC${Number(order.participation_fee).toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="py-4 pr-6 font-medium text-neutral-900">
                      &euro;{Number(order.total).toFixed(2)}
                    </td>
                    <td className="py-4 pr-6">
                      {order.invoice_pdf_url ? (
                        <a
                          href={`/api/admin/insurance-orders/${order.id}/pdf`}
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
                    <td className="py-4 pr-6">
                      <DeliveryBadge status={status} />
                    </td>
                    <td className="py-4">
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
