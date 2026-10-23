"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TA {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  photo_url: string | null;
  training_online: boolean;
  training_offline: boolean;
  onboarding_status: string;
  pay_level: number;
  pd_workshop_credits: number;
}

type Filter = "all" | "incomplete" | "online_missing" | "offline_missing" | "complete";

export function TrainingManagement({ tas }: { tas: TA[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();

  const complete = tas.filter((t) => t.training_online && t.training_offline);
  const incomplete = tas.filter((t) => !t.training_online || !t.training_offline);
  const onlineMissing = tas.filter((t) => !t.training_online);
  const offlineMissing = tas.filter((t) => !t.training_offline);

  const filtered = filter === "all" ? tas
    : filter === "complete" ? complete
    : filter === "incomplete" ? incomplete
    : filter === "online_missing" ? onlineMissing
    : offlineMissing;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fully Trained" value={complete.length} total={tas.length} color="green" onClick={() => setFilter("complete")} active={filter === "complete"} />
        <StatCard label="Incomplete" value={incomplete.length} total={tas.length} color="amber" onClick={() => setFilter("incomplete")} active={filter === "incomplete"} />
        <StatCard label="Online Missing" value={onlineMissing.length} total={tas.length} color="blue" onClick={() => setFilter("online_missing")} active={filter === "online_missing"} />
        <StatCard label="Offline Missing" value={offlineMissing.length} total={tas.length} color="purple" onClick={() => setFilter("offline_missing")} active={filter === "offline_missing"} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          Showing {filtered.length} of {tas.length} TAs
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="ml-2 text-xs text-blue-600 hover:text-blue-700">
              Clear filter
            </button>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-neutral-200/80 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Teaching Artist</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Online Onboarding</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Offline Foundation</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">PD Credits</th>
              <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filtered.map((ta) => {
              const name = ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email;
              const initials = [ta.first_name?.[0], ta.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
              const bothDone = ta.training_online && ta.training_offline;

              return (
                <tr key={ta.id} className="hover:bg-neutral-50/50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/teaching-artists/${ta.id}`} className="flex items-center gap-3">
                      {ta.photo_url ? (
                        <img src={ta.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">
                          {initials}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{name}</p>
                        <p className="text-[11px] text-neutral-400">Level {ta.pay_level}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <TrainingToggle taId={ta.id} field="training_online" checked={ta.training_online} onToggled={() => router.refresh()} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <TrainingToggle taId={ta.id} field="training_offline" checked={ta.training_offline} onToggled={() => router.refresh()} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-sm tabular-nums text-neutral-700">{ta.pd_workshop_credits}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      bothDone
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {bothDone ? (
                        <>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Complete
                        </>
                      ) : (
                        <>Incomplete</>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-500">
                  No TAs match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrainingToggle({ taId, field, checked, onToggled }: {
  taId: string; field: "training_online" | "training_offline"; checked: boolean; onToggled: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(checked);

  async function toggle() {
    const newValue = !value;
    setValue(newValue);
    setLoading(true);

    await fetch(`/api/admin/teaching-artists/${taId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newValue }),
    });

    setLoading(false);
    onToggled();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? "bg-green-500" : "bg-neutral-300"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        value ? "translate-x-5" : "translate-x-1"
      }`} />
    </button>
  );
}

function StatCard({ label, value, total, color, onClick, active }: {
  label: string; value: number; total: number; color: string; onClick: () => void; active: boolean;
}) {
  const colors: Record<string, string> = {
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
  };
  const textColors: Record<string, string> = {
    green: "text-green-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    purple: "text-purple-700",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-sm border p-5 text-left transition-all ${colors[color]} ${active ? "ring-2 ring-offset-1 ring-neutral-900" : ""}`}
    >
      <p className="text-[13px] font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${textColors[color]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-neutral-400">of {total} TAs</p>
    </button>
  );
}
