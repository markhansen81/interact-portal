"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface CrmDiff {
  field: string;
  label: string;
  offer: string | number | null;
  crm: string | number | null;
}

interface OfferCrmSyncProps {
  offerId: string;
  diffs: CrmDiff[];
  churchItemId: string;
}

export function OfferCrmSync({ offerId, diffs, churchItemId }: OfferCrmSyncProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || diffs.length === 0) return null;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/offers/${offerId}/sync-crm`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-sm p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-900">
            CRM data has changed
          </p>
          <p className="text-xs text-amber-700 mt-1">
            The linked CRM pipeline item has been updated. Review changes and update this offer.
          </p>
          <div className="mt-3 space-y-1.5">
            {diffs.map((d) => (
              <div key={d.field} className="flex items-center gap-2 text-xs">
                <span className="font-medium text-amber-900 w-24">{d.label}:</span>
                <span className="text-red-600 line-through">{d.offer ?? "—"}</span>
                <span className="text-amber-700">→</span>
                <span className="text-green-700 font-medium">{d.crm ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Updating..." : "Update from CRM"}
          </Button>
        </div>
      </div>
    </div>
  );
}
