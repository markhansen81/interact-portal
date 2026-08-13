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

export function InsuranceOrdersTable({ orders }: { orders: InsuranceOrder[] }) {
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  {search ? "No matching orders" : "No insurance orders yet"}
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
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
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.email_sent_at ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
