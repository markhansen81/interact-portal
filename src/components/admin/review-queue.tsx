"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ReviewTask {
  id: string;
  type: string;
  ta_id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
  ta: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    photo_url: string | null;
  };
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document_upload: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  profile_complete: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
    </svg>
  ),
};

const TYPE_COLORS: Record<string, string> = {
  document_upload: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  profile_complete: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
};

export function ReviewQueue({ reviews }: { reviews: ReviewTask[] }) {
  const [items, setItems] = useState(reviews);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const router = useRouter();

  async function handleAction(id: string, status: "approved" | "rejected") {
    await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, notes: notes || null }),
    });

    setItems((prev) => prev.filter((r) => r.id !== id));
    setActionId(null);
    setNotes("");
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <svg className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm text-zinc-500">No pending reviews</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((review) => {
          const ta = review.ta;
          const taName = ta.first_name && ta.last_name
            ? `${ta.first_name} ${ta.last_name}`
            : ta.email;
          const initials = [ta.first_name?.[0], ta.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
          const isExpanded = actionId === review.id;
          const timeAgo = getTimeAgo(review.created_at);

          return (
            <div key={review.id} className="px-6 py-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TYPE_COLORS[review.type] || "bg-zinc-100 text-zinc-500"}`}>
                  {TYPE_ICONS[review.type] || TYPE_ICONS.profile_complete}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{review.title}</p>
                      <p className="mt-0.5 text-[13px] text-zinc-500">{review.description}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo}</span>
                  </div>

                  {/* TA info */}
                  <div className="mt-3 flex items-center gap-2">
                    <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-2">
                      {ta.photo_url ? (
                        <img src={ta.photo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-500 dark:bg-zinc-800">
                          {initials}
                        </div>
                      )}
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{taName}</span>
                    </Link>

                    {/* Document link */}
                    {review.type === "document_upload" && (
                      <Link
                        href={`/admin/teaching-artists/${ta.id}`}
                        className="ml-2 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        View document
                      </Link>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!isExpanded ? (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleAction(review.id, "approved")}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setActionId(review.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Reason for rejection (sent to TA)..."
                        rows={2}
                        className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(review.id, "rejected")}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Confirm reject
                        </button>
                        <button
                          onClick={() => { setActionId(null); setNotes(""); }}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
