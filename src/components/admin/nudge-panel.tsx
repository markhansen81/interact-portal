"use client";

import { useState } from "react";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface MissingItem {
  id: string;
  label: string;
  category: "document" | "profile" | "training" | "availability";
  defaultMessage: string;
}

const NUDGE_TEMPLATES: Record<string, string> = {
  document: "Hi {{name}}, please upload your {{item}} as soon as possible so we can get you cleared for projects.",
  profile: "Hi {{name}}, your {{item}} is incomplete. Please finish it so we can match you to projects.",
  training: "Hi {{name}}, please complete your {{item}} to be eligible for work orders.",
  availability: "Hi {{name}}, please update your availability so we can assign you to upcoming projects.",
};

export function NudgePanel({ ta, missingItems }: { ta: TA; missingItems: MissingItem[] }) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [customOpen, setCustomOpen] = useState(false);
  const [customItem, setCustomItem] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [customSending, setCustomSending] = useState(false);

  const taName = ta.first_name || "there";

  async function sendNudge(item: MissingItem) {
    setSending(item.id);
    const message = NUDGE_TEMPLATES[item.category]
      ?.replace("{{name}}", taName)
      .replace("{{item}}", item.label) || item.defaultMessage;

    await fetch("/api/admin/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ta_id: ta.id, item: item.label, message }),
    });

    setSending(null);
    setSent((prev) => new Set(prev).add(item.id));
  }

  async function sendCustom() {
    if (!customItem.trim() || !customMessage.trim()) return;
    setCustomSending(true);
    await fetch("/api/admin/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ta_id: ta.id, item: customItem, message: customMessage }),
    });
    setCustomSending(false);
    setCustomItem("");
    setCustomMessage("");
    setCustomOpen(false);
  }

  if (missingItems.length === 0 && !customOpen) {
    return (
      <div className="overflow-hidden rounded-sm border border-green-200/80 bg-green-50/50">
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-700">All clear</p>
            <p className="text-[13px] text-green-600/70">Nothing missing — no nudges needed</p>
          </div>
          <button onClick={() => setCustomOpen(true)} className="ml-auto rounded-sm border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
            Send custom
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-neutral-200/80 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Nudge Reminders</h3>
          <p className="mt-0.5 text-[13px] text-neutral-500">{missingItems.length} item{missingItems.length !== 1 ? "s" : ""} need attention</p>
        </div>
        <button
          onClick={() => setCustomOpen(!customOpen)}
          className="rounded-sm border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {customOpen ? "Cancel" : "Custom nudge"}
        </button>
      </div>

      {/* Missing items */}
      <div className="divide-y divide-neutral-50">
        {missingItems.map((item) => {
          const isSent = sent.has(item.id);
          const isLoading = sending === item.id;

          return (
            <div key={item.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${
                item.category === "document" ? "bg-blue-50 text-blue-500" :
                item.category === "training" ? "bg-purple-50 text-purple-500" :
                item.category === "availability" ? "bg-amber-50 text-amber-500" :
                "bg-neutral-100 text-neutral-500"
              }`}>
                <CategoryIcon category={item.category} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                <p className="text-[11px] text-neutral-400 capitalize">{item.category}</p>
              </div>
              {isSent ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Sent
                </span>
              ) : (
                <button
                  onClick={() => sendNudge(item)}
                  disabled={isLoading}
                  className="rounded-sm bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Nudge"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom nudge form */}
      {customOpen && (
        <div className="border-t border-neutral-100 px-6 py-4 space-y-3">
          <input
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
            placeholder="Subject (e.g. Update your photo)"
            className="block w-full rounded-sm border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm focus:border-black focus:bg-white focus:outline-none"
          />
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Message to the TA..."
            rows={3}
            className="block w-full resize-none rounded-sm border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm focus:border-black focus:bg-white focus:outline-none"
          />
          <button
            onClick={sendCustom}
            disabled={customSending || !customItem.trim() || !customMessage.trim()}
            className="rounded-sm bg-neutral-900 px-5 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {customSending ? "Sending..." : "Send Nudge"}
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const cls = "h-4 w-4";
  switch (category) {
    case "document":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    case "training":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>;
    case "availability":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>;
  }
}
