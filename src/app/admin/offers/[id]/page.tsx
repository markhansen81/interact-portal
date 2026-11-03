import { redirect, notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { SendOfferPanel } from "@/components/admin/send-offer-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OfferDetailPage({ params }: Props) {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .single();

  if (!offer) notFound();

  // Fetch creator email for CC pre-fill
  let creatorEmail: string | null = null;
  if (offer.created_by) {
    const { data: creator } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", offer.created_by)
      .single();
    creatorEmail = creator?.email || null;
  }

  const fmt = (val: string | null) =>
    val ? new Date(val).toLocaleDateString("de-DE") : "—";

  const fmtMoney = (val: number | null) =>
    val != null
      ? `€${Number(val).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
      : "—";

  const total = fmtMoney(offer.total);

  const programLines: Array<Record<string, unknown>> =
    Array.isArray(offer.program_lines) && offer.program_lines.length > 0
      ? offer.program_lines
      : [];

  const programs: string[] =
    Array.isArray(offer.programs) && offer.programs.length > 0
      ? offer.programs
      : [offer.program_type].filter(Boolean);

  const statusColors: Record<string, string> = {
    accepted: "bg-green-100 text-green-800",
    sent: "bg-blue-100 text-blue-800",
    declined: "bg-red-100 text-red-700",
    expired: "bg-amber-100 text-amber-700",
    draft: "bg-neutral-100 text-neutral-600",
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/admin/offers" className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 mb-3">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Offers
        </Link>
        <PageHeader
          title={`Offer ${offer.offer_number || ""}`}
          description={offer.school_name || undefined}
          action={
            <Link
              href={`/admin/offers/${id}/edit`}
              className="inline-flex items-center justify-center font-medium transition-colors bg-neutral-900 text-white hover:bg-neutral-700 text-sm px-4 py-2 rounded"
            >
              Edit Offer
            </Link>
          }
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            statusColors[offer.status] || statusColors.draft
          }`}
        >
          {offer.status?.charAt(0).toUpperCase() + offer.status?.slice(1)}
        </span>
        <span className="text-sm font-semibold text-neutral-900">{total}</span>
        {offer.sent_at && (
          <span className="text-sm text-neutral-500">Sent {fmt(offer.sent_at)}</span>
        )}
        {offer.valid_until && (
          <span className="text-sm text-neutral-500">
            Valid until {fmt(offer.valid_until)}
          </span>
        )}
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* School */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            School
          </h3>
          <dl className="space-y-2">
            <DetailRow label="Name" value={offer.school_name} />
            <DetailRow label="Contact" value={offer.contact_name} />
            <DetailRow label="Email" value={offer.contact_email} />
            <DetailRow label="Address" value={offer.school_address} />
            <DetailRow
              label="City"
              value={[offer.city, offer.postcode].filter(Boolean).join(", ") || null}
            />
            <DetailRow label="State" value={offer.state} />
          </dl>
        </div>

        {/* Offer meta */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Offer Details
          </h3>
          <dl className="space-y-2">
            <DetailRow label="Programs" value={programs.join(", ")} />
            <DetailRow label="Tariff" value={
              offer.tariff === 1 ? "Tarif 1 — Schule stellt Homestay"
              : offer.tariff === 2 ? "Tarif 2 — InterACT Übernachtung"
              : null
            } />
            <DetailRow label="School Year" value={offer.school_year} />
            <DetailRow label="Created" value={fmt(offer.created_at)} />
            {offer.custom_notes && (
              <DetailRow label="Notes" value={offer.custom_notes} />
            )}
          </dl>
        </div>
      </div>

      {/* Per-program line items */}
      {programLines.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Program Details
          </h3>
          <div className="rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px_100px] gap-2 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              <span>Program</span>
              <span>Grade</span>
              <span>Students</span>
              <span>Groups</span>
              <span>Days</span>
              <span className="text-right">Subtotal</span>
            </div>
            {programLines.map((l, i) => {
              const sub = (Number(l.price_pp) || 0) * (Number(l.num_students) || 0);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_80px_80px_80px_100px] gap-2 px-4 py-3 text-sm items-center"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{String(l.program_type || "—")}</p>
                    {!!(l.start_date || l.end_date) && (
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {fmt((l.start_date as string | null) ?? null)}{l.end_date ? ` — ${fmt((l.end_date as string | null) ?? null)}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-neutral-600">{String(l.grade_level || "—")}</span>
                  <span className="text-neutral-600">{l.num_students != null ? String(l.num_students) : "—"}</span>
                  <span className="text-neutral-600">{l.num_groups != null ? String(l.num_groups) : "—"}</span>
                  <span className="text-neutral-600">{l.num_days != null ? String(l.num_days) : "—"}</span>
                  <span className="text-right font-medium text-neutral-900">{sub > 0 ? fmtMoney(sub) : "—"}</span>
                </div>
              );
            })}
            {/* Total row */}
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px_100px] gap-2 bg-neutral-50 px-4 py-2.5 text-sm font-semibold">
              <span className="text-neutral-700">Total</span>
              <span />
              <span />
              <span />
              <span />
              <span className="text-right text-neutral-900">{total}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Legacy single-program display */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Program Details
            </h3>
            <dl className="space-y-2">
              <DetailRow label="Grade" value={offer.grade_level} />
              <DetailRow label="Students" value={offer.num_students} />
              <DetailRow label="Groups" value={offer.num_groups} />
              <DetailRow label="TAs" value={offer.num_tas} />
              <DetailRow label="Days" value={offer.num_days} />
              <DetailRow label="Start" value={fmt(offer.start_date)} />
              <DetailRow label="End" value={fmt(offer.end_date)} />
            </dl>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Pricing
            </h3>
            <dl className="space-y-2">
              <DetailRow
                label="Price / student"
                value={offer.price_pp != null ? `€${Number(offer.price_pp).toFixed(2)}` : null}
              />
              <DetailRow label="Total" value={total} />
            </dl>
          </div>
        </div>
      )}

      {/* Send panel */}
      {offer.contact_email && (
        <SendOfferPanel
          offerId={id}
          status={offer.status}
          contactEmail={offer.contact_email}
          contactName={offer.contact_name}
          creatorEmail={creatorEmail}
        />
      )}

      {/* PDF preview — at the bottom */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">PDF Preview</span>
          <div className="flex items-center gap-4">
            <a
              href={`/api/admin/offers/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 hover:text-neutral-900 underline"
            >
              Open in new tab
            </a>
            <a
              href={`/api/admin/offers/${id}/pdf`}
              download={`Angebot_${offer.offer_number}.pdf`}
              className="text-sm text-neutral-500 hover:text-neutral-900 underline"
            >
              Download
            </a>
          </div>
        </div>
        <iframe
          src={`/api/admin/offers/${id}/pdf`}
          className="w-full"
          style={{ height: "85vh" }}
          title="Offer PDF Preview"
        />
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
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-28 shrink-0 text-xs text-neutral-400">{label}</dt>
      <dd className="text-sm text-neutral-900">{value}</dd>
    </div>
  );
}
