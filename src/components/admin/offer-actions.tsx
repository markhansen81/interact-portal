"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface OfferActionsProps {
  offerId: string;
  status: string;
}

export function OfferActions({ offerId, status }: OfferActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "send" | "accept" | "decline") {
    setLoading(action);
    setError(null);

    try {
      const url =
        action === "send"
          ? `/api/admin/offers/${offerId}/send`
          : `/api/admin/offers/${offerId}/status`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action !== "send" ? { status: action === "accept" ? "accepted" : "declined" } : {}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action}`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "draft" && (
        <Button
          size="sm"
          onClick={() => handleAction("send")}
          disabled={loading !== null}
        >
          {loading === "send" ? "Sending..." : "Send"}
        </Button>
      )}
      {(status === "sent" || status === "draft") && (
        <>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAction("accept")}
            disabled={loading !== null}
          >
            {loading === "accept" ? "..." : "Mark Accepted"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleAction("decline")}
            disabled={loading !== null}
          >
            {loading === "decline" ? "..." : "Mark Declined"}
          </Button>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
