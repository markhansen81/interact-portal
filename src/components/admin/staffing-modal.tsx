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
      <div className="mx-4 w-full max-w-2xl rounded-sm bg-white">
        {/* Header */}
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                Staff TA
              </h3>
              <p className="mt-0.5 text-sm text-neutral-500">
                {churchItem.school_name || churchItem.name} —{" "}
                {churchItem.program_type || "Project"} —{" "}
                {churchItem.start_date || "No date"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-sm p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              ✕
            </button>
          </div>

          {/* Project info pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {churchItem.state && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {churchItem.state}
              </span>
            )}
            {churchItem.grade_level && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {churchItem.grade_level}
              </span>
            )}
            {churchItem.num_days && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {churchItem.num_days} days
              </span>
            )}
            {churchItem.accommodation && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {churchItem.accommodation}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-neutral-200 px-6 py-3">
          <input
            type="text"
            placeholder="Search TAs by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        {/* TA List */}
        <div className="max-h-96 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-400">
              No TAs found
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {sorted.map((ta) => (
                <div
                  key={ta.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3">
                    {ta.photo_url ? (
                      <img
                        src={ta.photo_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600">
                        {ta.first_name?.[0]}
                        {ta.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {ta.first_name} {ta.last_name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {ta.city || "—"} · Level {ta.pay_level || "—"}
                        {ta.homestay_willing && " · Homestay OK"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssign(ta.id)}
                    disabled={assigning === ta.id}
                    className="rounded-sm bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assigning === ta.id ? "Assigning..." : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-3">
          <p className="text-xs text-neutral-400">
            {sorted.length} TAs available · Assigning creates a work order automatically
          </p>
        </div>
      </div>
    </div>
  );
}
