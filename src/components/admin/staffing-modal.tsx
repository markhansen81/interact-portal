"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TAProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string | null;
  country: string | null;
  pay_level: number | null;
  camp_level: number | null;
  is_active: boolean;
  homestay_willing: boolean;
  exp_grades_1_4: boolean;
  exp_grades_5_7: boolean;
  exp_grades_8_plus: boolean;
  photo_url: string | null;
}

interface ChurchItem {
  id: string;
  name: string;
  school_name: string | null;
  state: string | null;
  city: string | null;
  program_type: string | null;
  grade_level: string | null;
  num_days: number | null;
  start_date: string | null;
  end_date: string | null;
  accommodation: string | null;
}

interface StaffingModalProps {
  churchItem: ChurchItem;
  slotId: string;
  availableTAs: TAProfile[];
  onClose: () => void;
}

export function StaffingModal({
  churchItem,
  slotId,
  availableTAs,
  onClose,
}: StaffingModalProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  // Filter TAs based on search and basic criteria
  const filtered = availableTAs.filter((ta) => {
    const name = `${ta.first_name} ${ta.last_name}`.toLowerCase();
    const searchLower = search.toLowerCase();
    if (search && !name.includes(searchLower) && !ta.city?.toLowerCase().includes(searchLower)) {
      return false;
    }
    return true;
  });

  // Sort: prioritize TAs in the same state/city
  const sorted = [...filtered].sort((a, b) => {
    // Same city first
    if (a.city === churchItem.city && b.city !== churchItem.city) return -1;
    if (b.city === churchItem.city && a.city !== churchItem.city) return 1;
    // Then by name
    return `${a.last_name}`.localeCompare(`${b.last_name}`);
  });

  const handleAssign = async (taId: string) => {
    setAssigning(taId);
    try {
      const res = await fetch("/api/admin/church/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          taId,
          churchItemId: churchItem.id,
        }),
      });

      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || "Assignment failed");
      }
    } catch {
      alert("Assignment failed");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        {/* Header */}
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Staff TA
              </h3>
              <p className="mt-0.5 text-sm text-zinc-500">
                {churchItem.school_name || churchItem.name} —{" "}
                {churchItem.program_type || "Project"} —{" "}
                {churchItem.start_date || "No date"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>

          {/* Project info pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {churchItem.state && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {churchItem.state}
              </span>
            )}
            {churchItem.grade_level && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {churchItem.grade_level}
              </span>
            )}
            {churchItem.num_days && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {churchItem.num_days} days
              </span>
            )}
            {churchItem.accommodation && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {churchItem.accommodation}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-700">
          <input
            type="text"
            placeholder="Search TAs by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            autoFocus
          />
        </div>

        {/* TA List */}
        <div className="max-h-96 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-400">
              No TAs found
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sorted.map((ta) => (
                <div
                  key={ta.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    {ta.photo_url ? (
                      <img
                        src={ta.photo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
                        {ta.first_name?.[0]}
                        {ta.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {ta.first_name} {ta.last_name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {ta.city || "—"} · Level {ta.pay_level || "—"}
                        {ta.homestay_willing && " · Homestay OK"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(ta.id)}
                    disabled={assigning === ta.id}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assigning === ta.id ? "Assigning..." : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-3 dark:border-zinc-700">
          <p className="text-xs text-zinc-400">
            {sorted.length} TAs available · Assigning creates a work order automatically
          </p>
        </div>
      </div>
    </div>
  );
}
