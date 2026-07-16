"use client";

import { useState } from "react";
import { StaffingModal } from "./staffing-modal";

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

interface TASlot {
  id: string;
  slot_number: number;
  ta_id: string | null;
  work_order_id: string | null;
  status: string;
  profiles: TAProfile | null;
}

interface ChurchItem {
  id: string;
  name: string;
  school_name: string | null;
  source: "opportunity" | "project";
  deal_value: number | null;
  deal_stage: string | null;
  project_status: string | null;
  program_type: string | null;
  school_type: string | null;
  grade_level: string | null;
  num_students: number | null;
  num_groups: number | null;
  num_days: number | null;
  num_tas: number | null;
  price_pp: number | null;
  co_taught: string | null;
  accommodation: string | null;
  state: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  kw: number | null;
  year: number | null;
  coord_status: string | null;
  staff_status: string | null;
  staffing_notes: string | null;
  church_ta_slots: TASlot[];
}

interface ChurchViewProps {
  groups: Record<string, ChurchItem[]>;
  availableTAs: TAProfile[];
}

export function ChurchView({ groups, availableTAs }: ChurchViewProps) {
  const [staffingModal, setStaffingModal] = useState<{
    churchItem: ChurchItem;
    slotId: string;
  } | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(Object.keys(groups))
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const coordColors: Record<string, string> = {
    ToDo: "bg-yellow-100 text-yellow-800",
    "Coord. Ongoing": "bg-blue-100 text-blue-800",
    "Coord. done": "bg-green-100 text-green-800",
    "Project Done": "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <>
      <div className="space-y-4">
        {Object.entries(groups).map(([kwLabel, items]) => (
          <div
            key={kwLabel}
            className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* KW Header */}
            <button
              onClick={() => toggleGroup(kwLabel)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {kwLabel}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                  {items.length} {items.length === 1 ? "project" : "projects"}
                </span>
              </div>
              <span className="text-zinc-400">
                {expandedGroups.has(kwLabel) ? "▾" : "▸"}
              </span>
            </button>

            {expandedGroups.has(kwLabel) && (
              <div className="border-t border-zinc-200 dark:border-zinc-800">
                {items.map((item) => {
                  const slots = item.church_ta_slots || [];
                  const filled = slots.filter((s) => s.ta_id).length;
                  const total = item.num_tas || 0;

                  return (
                    <div
                      key={item.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50"
                    >
                      {/* Project row */}
                      <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                        {/* Name + source badge */}
                        <div className="col-span-3 flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              item.source === "project"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                            {item.school_name || item.name}
                          </span>
                        </div>

                        {/* Program */}
                        <div className="col-span-1 text-zinc-500 truncate">
                          {item.program_type || "—"}
                        </div>

                        {/* State */}
                        <div className="col-span-1 text-zinc-500 truncate">
                          {item.state || "—"}
                        </div>

                        {/* Dates */}
                        <div className="col-span-1 text-zinc-500 whitespace-nowrap">
                          {item.start_date
                            ? `${item.start_date.slice(5)}`
                            : "—"}
                        </div>

                        {/* Days */}
                        <div className="col-span-1 text-center text-zinc-500">
                          {item.num_days || "—"}d
                        </div>

                        {/* Students/Groups */}
                        <div className="col-span-1 text-center text-zinc-500">
                          {item.num_students || "—"}/{item.num_groups || "—"}
                        </div>

                        {/* Price */}
                        <div className="col-span-1 text-center text-zinc-500">
                          {item.price_pp ? `€${item.price_pp}` : "—"}
                        </div>

                        {/* Staffing */}
                        <div className="col-span-1 text-center">
                          {total > 0 ? (
                            <span
                              className={`text-xs font-bold ${
                                filled >= total
                                  ? "text-green-600"
                                  : filled > 0
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {filled}/{total} TAs
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </div>

                        {/* Value */}
                        <div className="col-span-1 text-right text-zinc-500">
                          {item.deal_value
                            ? `€${item.deal_value.toLocaleString()}`
                            : "—"}
                        </div>

                        {/* Status */}
                        <div className="col-span-1 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              coordColors[item.coord_status || ""] ||
                              "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {item.coord_status || "ToDo"}
                          </span>
                        </div>
                      </div>

                      {/* TA Sub-rows */}
                      {total > 0 && (
                        <div className="bg-zinc-50/50 px-4 pb-3 dark:bg-zinc-800/20">
                          <div className="ml-4 space-y-1">
                            {slots.map((slot) => (
                              <div
                                key={slot.id}
                                className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs"
                              >
                                <span className="w-6 text-zinc-400">
                                  TA {slot.slot_number}
                                </span>

                                {slot.ta_id && slot.profiles ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      {slot.profiles.photo_url ? (
                                        <img
                                          src={slot.profiles.photo_url}
                                          alt=""
                                          className="h-5 w-5 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-600">
                                          {slot.profiles.first_name?.[0]}
                                          {slot.profiles.last_name?.[0]}
                                        </div>
                                      )}
                                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {slot.profiles.first_name}{" "}
                                        {slot.profiles.last_name}
                                      </span>
                                    </div>
                                    <span className="text-zinc-400">
                                      {slot.profiles.city}
                                    </span>
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                        slot.status === "confirmed"
                                          ? "bg-green-100 text-green-700"
                                          : slot.status === "assigned"
                                            ? "bg-blue-100 text-blue-700"
                                            : slot.status === "offered"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : slot.status === "declined"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-zinc-100 text-zinc-500"
                                      }`}
                                    >
                                      {slot.status}
                                    </span>
                                  </>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setStaffingModal({
                                        churchItem: item,
                                        slotId: slot.id,
                                      })
                                    }
                                    className="rounded-md border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-zinc-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                                  >
                                    + Staff TA
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {Object.keys(groups).length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-500">No Church items yet.</p>
            <p className="mt-1 text-sm text-zinc-400">
              Set an Opportunity&apos;s &quot;Church&quot; status to &quot;Add to
              Church&quot; in Monday to sync it here.
            </p>
          </div>
        )}
      </div>

      {/* Staffing Modal */}
      {staffingModal && (
        <StaffingModal
          churchItem={staffingModal.churchItem}
          slotId={staffingModal.slotId}
          availableTAs={availableTAs}
          onClose={() => setStaffingModal(null)}
        />
      )}
    </>
  );
}
