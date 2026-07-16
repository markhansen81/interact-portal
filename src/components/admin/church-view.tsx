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
  opp_status: string | null;
  project_status: string | null;
  program_type: string | null;
  project_type: string | null;
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
  street: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  teacher_contact: string | null;
  start_date: string | null;
  end_date: string | null;
  kw: number | null;
  year: number | null;
  coord_status: string | null;
  staff_status: string | null;
  staffing_notes: string | null;
  special_conditions: string | null;
  invoice_status: string | null;
  invoice_notes: string | null;
  contract_sent: string | null;
  contract_received: string | null;
  date_paid: string | null;
  paid_status: string | null;
  // Coordination checklists
  folder_setup: string | null;
  notes_check: string | null;
  ta_profiles: string | null;
  info_mail: string | null;
  schedule_drafted: string | null;
  schedule_mail_is: string | null;
  schedule_mail_jh: string | null;
  deadline_schedule: string | null;
  final_project_mail: string | null;
  travel_status: string | null;
  hotel_room: string | null;
  jh_room_deadline: string | null;
  jh_room_reminder: string | null;
  homestay: string | null;
  homestay_profile: string | null;
  // Feedback
  ta_feedback: string | null;
  student_feedback: string | null;
  jh_feedback_mail: string | null;
  feedback_school: string | null;
  feedback_ta: string | null;
  // Slots
  church_ta_slots: TASlot[];
}

interface ChurchViewProps {
  groups: Record<string, ChurchItem[]>;
  availableTAs: TAProfile[];
}

const statusBadge = (val: string | null) => {
  if (!val) return null;
  const colors: Record<string, string> = {
    Done: "bg-green-500",
    "Working on it": "bg-amber-500",
    Stuck: "bg-red-500",
    "n/a": "bg-zinc-300",
    Staffed: "bg-green-500",
    pending: "bg-amber-500",
    cancelled: "bg-red-500",
    invoiced: "bg-green-500",
    "not invoiced": "bg-red-500",
    "Coord. done": "bg-green-500",
    "Coord. Ongoing": "bg-blue-500",
    "Project Done": "bg-green-500",
    ToDo: "bg-amber-500",
    "book early": "bg-purple-500",
    "TA Self booking": "bg-blue-400",
    "school books hotel": "bg-blue-400",
    scheduled: "bg-blue-400",
  };
  const color = colors[val] || "bg-zinc-400";
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} title={val} />
  );
};

export function ChurchView({ groups, availableTAs }: ChurchViewProps) {
  const [staffingModal, setStaffingModal] = useState<{
    churchItem: ChurchItem;
    slotId: string;
  } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(Object.keys(groups))
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="space-y-3">
        {Object.entries(groups).map(([kwLabel, items]) => (
          <div key={kwLabel} className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            {/* KW Header */}
            <button
              onClick={() => toggleGroup(kwLabel)}
              className="flex w-full items-center justify-between px-3 py-2 text-left bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{kwLabel}</span>
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-700">{items.length}</span>
              </div>
              <span className="text-[10px] text-zinc-400">{expandedGroups.has(kwLabel) ? "▾" : "▸"}</span>
            </button>

            {expandedGroups.has(kwLabel) && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <th className="px-2 py-1.5 text-left font-medium text-zinc-500 w-48">School</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Opp</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Coord</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Type</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Staff</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Address</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Dates</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">State</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500">Days</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Program</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Grade</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Co-T</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Accom</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Contact</th>
                      <th className="px-1 py-1.5 text-left font-medium text-zinc-500">Email</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500">SuS</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500">Grp</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500">TAs</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500">€pp</th>
                      <th className="px-1 py-1.5 text-right font-medium text-zinc-500">Value</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500">Inv</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500" title="Contract Sent">CS</th>
                      <th className="px-1 py-1.5 text-center font-medium text-zinc-500" title="Contract Received">CR</th>
                      {/* Coordination checklist headers */}
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Folder set up">📁</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Notes">📝</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="TA Profiles">👤</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Info Mail to School">✉️</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Schedule Drafted">📅</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Schedule Mail IS">📤</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Schedule Mail JH">📤</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Final Project Mail">📨</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Travel">🚂</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Hotel/Room">🏨</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Homestay">🏠</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="TA Feedback">📋</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Student Feedback">📋</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Feedback to School">📧</th>
                      <th className="px-0.5 py-1.5 text-center font-medium text-zinc-400" title="Feedback to TA">📧</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((item) => {
                      const slots = item.church_ta_slots || [];
                      const filled = slots.filter((s) => s.ta_id).length;
                      const total = item.num_tas || 0;
                      const value = item.deal_value || (item.price_pp && item.num_students ? item.price_pp * item.num_students : null);
                      const isExpanded = expandedItems.has(item.id);

                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => total > 0 && toggleItem(item.id)}>
                          {/* School name */}
                          <td className="px-2 py-1.5 font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${item.source === "project" ? "bg-green-500" : "bg-blue-500"}`} />
                            {item.school_name || item.name}
                          </td>
                          {/* Opp status */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[60px]">{item.opp_status || item.deal_stage || "—"}</td>
                          {/* Coord status */}
                          <td className="px-1 py-1.5">
                            <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                              item.coord_status === "Coord. done" || item.coord_status === "Project Done" ? "bg-green-100 text-green-700" :
                              item.coord_status === "Coord. Ongoing" ? "bg-blue-100 text-blue-700" :
                              item.coord_status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>{item.coord_status || "ToDo"}</span>
                          </td>
                          {/* Type */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[70px]">{item.project_type || item.program_type || "—"}</td>
                          {/* Staff status */}
                          <td className="px-1 py-1.5">
                            {total > 0 ? (
                              <span className={`text-[10px] font-bold ${filled >= total ? "text-green-600" : "text-red-600"}`}>{filled}/{total}</span>
                            ) : (
                              <span className="text-zinc-400">{item.staff_status || "—"}</span>
                            )}
                          </td>
                          {/* Address */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[120px]">{item.street || "—"}</td>
                          {/* Dates */}
                          <td className="px-1 py-1.5 text-zinc-500 whitespace-nowrap">{item.start_date ? `${item.start_date.slice(5)}` : "—"}{item.end_date && item.end_date !== item.start_date ? `–${item.end_date.slice(8)}` : ""}</td>
                          {/* State */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[60px]">{item.state || "—"}</td>
                          {/* Days */}
                          <td className="px-1 py-1.5 text-center text-zinc-500">{item.num_days || "—"}</td>
                          {/* Program */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[80px]">{item.program_type || "—"}</td>
                          {/* Grade */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[60px]">{item.grade_level || "—"}</td>
                          {/* Co-taught */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[50px]">{item.co_taught || "—"}</td>
                          {/* Accommodation */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[60px]">{item.accommodation || "—"}</td>
                          {/* Teacher contact */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[80px]">{item.teacher_contact || item.contact_phone || "—"}</td>
                          {/* Email */}
                          <td className="px-1 py-1.5 text-zinc-500 truncate max-w-[100px]">{item.contact_email || "—"}</td>
                          {/* Students */}
                          <td className="px-1 py-1.5 text-center text-zinc-500">{item.num_students || "—"}</td>
                          {/* Groups */}
                          <td className="px-1 py-1.5 text-center text-zinc-500">{item.num_groups || "—"}</td>
                          {/* TAs */}
                          <td className="px-1 py-1.5 text-center text-zinc-500">{item.num_tas || "—"}</td>
                          {/* Price pp */}
                          <td className="px-1 py-1.5 text-center text-zinc-500">{item.price_pp ? `€${item.price_pp}` : "—"}</td>
                          {/* Value */}
                          <td className="px-1 py-1.5 text-right text-zinc-600 font-medium">{value ? `€${value.toLocaleString()}` : "—"}</td>
                          {/* Invoice */}
                          <td className="px-1 py-1.5 text-center">
                            <span className={`rounded px-1 py-0.5 text-[9px] ${
                              item.invoice_status === "invoiced" ? "bg-green-100 text-green-700" :
                              item.invoice_status === "not invoiced" ? "bg-red-100 text-red-700" :
                              item.invoice_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              "bg-zinc-100 text-zinc-500"
                            }`}>{item.invoice_status || "—"}</span>
                          </td>
                          {/* Contract sent */}
                          <td className="px-1 py-1.5 text-center text-zinc-400">{item.contract_sent ? "✓" : ""}</td>
                          {/* Contract received */}
                          <td className="px-1 py-1.5 text-center text-zinc-400">{item.contract_received ? "✓" : ""}</td>
                          {/* Checklists */}
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.folder_setup)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.notes_check)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.ta_profiles)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.info_mail)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.schedule_drafted)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.schedule_mail_is)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.schedule_mail_jh)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.final_project_mail)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.travel_status)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.hotel_room)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.homestay)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.ta_feedback)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.student_feedback)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.feedback_school)}</td>
                          <td className="px-0.5 py-1.5 text-center">{statusBadge(item.feedback_ta)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {Object.keys(groups).length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-500">No Church items yet.</p>
          </div>
        )}
      </div>

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
