"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SendOfferPanelProps {
  offerId: string;
  status: string;
  contactEmail: string;
  contactName: string | null;
  creatorEmail: string | null;
  offerTotal: number | null;
}

export function SendOfferPanel({
  offerId,
  status,
  contactEmail,
  contactName,
  creatorEmail,
  offerTotal,
}: SendOfferPanelProps) {
  const router = useRouter();
  const [cc, setCc] = useState(creatorEmail || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  async function handleSend() {
    if (!offerTotal || offerTotal <= 0) {
      setError("Cannot send an offer with a €0 total. Please edit the offer and add line items.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cc: cc || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function handleStatus(newStatus: "accepted" | "declined") {
    if (newStatus === "accepted") setAccepting(true);
    else setDeclining(true);
    try {
      await fetch(`/api/admin/offers/${offerId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setAccepting(false);
      setDeclining(false);
    }
  }

  if (status !== "draft" && status !== "sent") return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
        {status === "draft" ? "Send Offer" : "Resend Offer"}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* To */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1">To</label>
          <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2">
            <svg className="h-3.5 w-3.5 shrink-0 text-neutral-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <span className="text-sm text-neutral-700">{contactEmail}</span>
            {contactName && <span className="text-xs text-neutral-400">({contactName})</span>}
          </div>
        </div>

        {/* CC */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1">CC</label>
          <input
            type="email"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@interactenglish.de"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {sending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Offer + PDF
            </>
          )}
        </button>

        {status === "sent" && (
          <>
            <button
              onClick={() => handleStatus("accepted")}
              disabled={accepting}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {accepting ? "…" : "Mark Accepted"}
            </button>
            <button
              onClick={() => handleStatus("declined")}
              disabled={declining}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {declining ? "…" : "Mark Declined"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
