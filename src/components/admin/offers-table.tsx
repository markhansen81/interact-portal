"use client";

import { useState } from "react";
import Link from "next/link";
import { StatCard, Badge } from "@/components/ui";

interface Offer {
  id: string;
  offer_number: string | null;
  school_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  program_type: string | null;
  programs: string[] | null;
  num_students: number | null;
  total: number | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  valid_until: string | null;
}

type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

const statusVariant: Record<OfferStatus, "default" | "info" | "success" | "error" | "warning"> = {
  draft: "default",
  sent: "info",
  accepted: "success",
  declined: "error",
  expired: "warning",
};

const statusLabel: Record<OfferStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
];

export function OffersTable({ offers }: { offers: Offer[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const afterSearch = offers.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.school_name?.toLowerCase().includes(s) ||
      o.contact_name?.toLowerCase().includes(s) ||
      o.contact_email?.toLowerCase().includes(s) ||
      o.program_type?.toLowerCase().includes(s) ||
      o.offer_number?.toLowerCase().includes(s)
    );
  });

  const filtered = statusFilter === "all" ? afterSearch : afterSearch.filter((o) => o.status === statusFilter);

  const statusCounts = STATUS_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f.key] = f.key === "all" ? afterSearch.length : afterSearch.filter((o) => o.status === f.key).length;
    return acc;
  }, {});

  const draftCount = offers.filter((o) => o.status === "draft").length;
  const sentCount = offers.filter((o) => o.status === "sent").length;
  const acceptedCount = offers.filter((o) => o.status === "accepted").length;
  const acceptedRevenue = offers
    .filter((o) => o.status === "accepted")
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 divide-x divide-neutral-200 lg:grid-cols-5 border-b border-neutral-200 pb-8">
        <div>
          <StatCard compact label="Total Offers" value={offers.length} />
        </div>
        <div className="pl-6">
          <StatCard compact label="Draft" value={draftCount} />
        </div>
        <div className="pl-6">
          <StatCard compact label="Sent" value={sentCount} />
        </div>
        <div className="pl-6">
          <StatCard compact label="Accepted" value={acceptedCount} />
        </div>
        <div className="pl-6">
          <StatCard
            compact
            label="Revenue"
            value={`\u20AC${acceptedRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`}
          />
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by school, contact, program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm border border-neutral-300 bg-white rounded-sm py-2 pl-8 pr-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-1 rounded-sm bg-neutral-100 p-1 self-start">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key ? "bg-white text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {f.label}
              <span className="ml-1 text-neutral-400">{statusCounts[f.key]}</span>
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
                Offer #
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                School
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Programs
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Students
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Total
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Status
              </th>
              <th className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Created
              </th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400">
                  {search || statusFilter !== "all" ? "No matching offers" : "No offers yet"}
                </td>
              </tr>
            ) : (
              filtered.map((offer) => {
                const status = (offer.status || "draft") as OfferStatus;
                return (
                  <tr
                    key={offer.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="py-4 pr-6 font-medium text-neutral-900">
                      {offer.offer_number || "-"}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="text-neutral-900">{offer.school_name || "-"}</div>
                      {offer.contact_name && (
                        <div className="text-xs text-neutral-500">{offer.contact_name}</div>
                      )}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {Array.isArray(offer.programs) && offer.programs.length > 0
                        ? offer.programs.join(", ")
                        : offer.program_type || "-"}
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {offer.num_students ?? "-"}
                    </td>
                    <td className="py-4 pr-6 font-medium text-neutral-900">
                      {offer.total != null
                        ? `\u20AC${Number(offer.total).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </td>
                    <td className="py-4 pr-6">
                      <Badge variant={statusVariant[status] || "default"}>
                        {statusLabel[status] || status}
                      </Badge>
                    </td>
                    <td className="py-4 pr-6 text-neutral-600">
                      {new Date(offer.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/admin/offers/${offer.id}`}
                        className="text-sm text-neutral-900 underline hover:text-neutral-600"
                      >
                        View
                      </Link>
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
