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

export function OffersTable({ offers }: { offers: Offer[] }) {
  const [search, setSearch] = useState("");

  const filtered = offers.filter((o) => {
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

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by school, contact, program..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-neutral-300 bg-white rounded-sm px-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-0 transition-colors"
        />
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
                  {search ? "No matching offers" : "No offers yet"}
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
