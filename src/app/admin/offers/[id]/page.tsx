import { redirect, notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { OfferActions } from "@/components/admin/offer-actions";
// CRM auto-syncs via Postgres trigger on church_items update

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OfferDetailPage({ params }: Props) {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const { id } = await params;
  const supabase = await createClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .single();

  if (!offer) notFound();

  const fmt = (val: string | null) =>
    val ? new Date(val).toLocaleDateString("de-DE") : "-";

  const total = offer.total
    ? `\u20AC${Number(offer.total).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
    : "-";

  // Check if offer was auto-updated from CRM after it was sent
  const wasAutoUpdated = offer.church_item_id
    && offer.sent_at
    && offer.updated_at
    && new Date(offer.updated_at) > new Date(offer.sent_at)
    && (offer.status === "draft" || offer.status === "sent");

  return (
    <div className="space-y-8">
      {/* CRM auto-update notice */}
      {wasAutoUpdated && (
        <div className="border border-blue-200 bg-blue-50 rounded-sm px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Updated from CRM
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              This offer was automatically updated from the CRM pipeline on {fmt(offer.updated_at)}.
              {offer.status === "sent" && " You may want to resend the updated version."}
            </p>
          </div>
          {offer.status === "sent" && (
            <Link
              href={`/admin/offers/${id}/edit`}
              className="text-sm text-blue-700 underline hover:text-blue-900"
            >
              Review & Resend
            </Link>
          )}
        </div>
      )}

      <PageHeader
        title={`Offer ${offer.offer_number || ""}`}
        description={offer.school_name || undefined}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/offers/${id}/edit`}
              className="inline-flex items-center justify-center font-medium transition-colors border border-neutral-900 text-neutral-900 bg-transparent hover:bg-neutral-50 text-sm px-3 py-1.5"
            >
              Edit
            </Link>
            <OfferActions offerId={id} status={offer.status} />
          </div>
        }
      />

      {/* Status & timestamps */}
      <div className="flex items-center gap-4 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            offer.status === "accepted"
              ? "bg-neutral-900 text-white"
              : offer.status === "sent"
              ? "bg-neutral-200 text-neutral-800"
              : offer.status === "declined"
              ? "bg-red-50 text-red-700"
              : offer.status === "expired"
              ? "bg-amber-50 text-amber-700"
              : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {offer.status?.charAt(0).toUpperCase() + offer.status?.slice(1)}
        </span>
        {offer.sent_at && (
          <span className="text-neutral-500">
            Sent {fmt(offer.sent_at)}
          </span>
        )}
        {offer.valid_until && (
          <span className="text-neutral-500">
            Valid until {fmt(offer.valid_until)}
          </span>
        )}
        {offer.pdf_url && (
          <a
            href={offer.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-900 underline hover:text-neutral-600"
          >
            View PDF
          </a>
        )}
        <span className="text-neutral-900 font-medium">{total}</span>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* School info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            School Information
          </h3>
          <dl className="space-y-3">
            <DetailRow label="School Name" value={offer.school_name} />
            <DetailRow label="Contact" value={offer.contact_name} />
            <DetailRow label="Email" value={offer.contact_email} />
            <DetailRow label="Address" value={offer.school_address} />
            <DetailRow
              label="City / Postcode"
              value={[offer.city, offer.postcode].filter(Boolean).join(", ") || null}
            />
            <DetailRow label="State" value={offer.state} />
          </dl>
        </div>

        {/* Program info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Program Details
          </h3>
          <dl className="space-y-3">
            <DetailRow
              label="Programs"
              value={
                Array.isArray(offer.programs) && offer.programs.length > 0
                  ? offer.programs.join(", ")
                  : offer.program_type
              }
            />
            <DetailRow label="Grade Level" value={offer.grade_level} />
            <DetailRow label="Students" value={offer.num_students} />
            <DetailRow label="Groups" value={offer.num_groups} />
            <DetailRow label="TAs" value={offer.num_tas} />
            <DetailRow label="Days" value={offer.num_days} />
            <DetailRow label="Start Date" value={fmt(offer.start_date)} />
            <DetailRow label="End Date" value={fmt(offer.end_date)} />
            <DetailRow label="School Year" value={offer.school_year} />
          </dl>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Pricing
          </h3>
          <dl className="space-y-3">
            <DetailRow
              label="Tariff"
              value={
                offer.tariff === 1
                  ? "Tarif 1 — Schule stellt Homestay"
                  : offer.tariff === 2
                  ? "Tarif 2 — InterACT übernimmt Übernachtung"
                  : offer.tariff
              }
            />
            <DetailRow
              label="Price per Student"
              value={
                offer.price_pp != null
                  ? `\u20AC${Number(offer.price_pp).toFixed(2)}`
                  : null
              }
            />
            <DetailRow label="Total" value={total} />
          </dl>
        </div>

        {/* Meta */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Additional
          </h3>
          <dl className="space-y-3">
            <DetailRow label="Valid Until" value={fmt(offer.valid_until)} />
            <DetailRow label="Created" value={fmt(offer.created_at)} />
            {offer.pdf_url && (
              <div className="flex items-baseline gap-4">
                <dt className="w-32 shrink-0 text-sm text-neutral-500">PDF</dt>
                <dd>
                  <a
                    href={offer.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-900 underline hover:text-neutral-600"
                  >
                    Download PDF
                  </a>
                </dd>
              </div>
            )}
            {offer.notes && <DetailRow label="Notes" value={offer.notes} />}
          </dl>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <dt className="w-32 shrink-0 text-sm text-neutral-500">{label}</dt>
      <dd className="text-sm text-neutral-900">{value ?? "-"}</dd>
    </div>
  );
}
