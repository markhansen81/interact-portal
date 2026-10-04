"use client";

import { useState, useEffect, useCallback } from "react";

type AttendanceStatus = "present" | "absent" | "late" | null;

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  needs_notes: string | null;
  group_id: string;
}

interface Group {
  id: string;
  name: string;
  grade: string | null;
  english_level: string | null;
  project_students: Student[];
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
}

function getWeekdaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");

  while (current <= last) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function StatusCell({
  status,
  onClick,
  saving,
}: {
  status: AttendanceStatus;
  onClick: () => void;
  saving: boolean;
}) {
  const base = "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold cursor-pointer transition-colors";
  let style: string;
  let label: string;

  switch (status) {
    case "present":
      style = "border-green-400 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700";
      label = "\u2713";
      break;
    case "absent":
      style = "border-red-400 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700";
      label = "\u2717";
      break;
    case "late":
      style = "border-yellow-400 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-700";
      label = "\u23F0";
      break;
    default:
      style = "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500";
      label = "-";
  }

  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`${base} ${style} ${saving ? "opacity-50" : ""}`}
      title={status || "unmarked"}
    >
      {label}
    </button>
  );
}

export function AttendanceRoll({
  projectId,
  startDate,
  endDate,
}: {
  projectId: string;
  startDate: string;
  endDate: string;
  days: number | null;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add group form
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", grade: "", english_level: "" });
  const [addingGroup, setAddingGroup] = useState(false);

  // Add student form
  const [newStudent, setNewStudent] = useState({ first_name: "", last_name: "" });
  const [addingStudent, setAddingStudent] = useState(false);

  const weekdays = getWeekdaysBetween(startDate, endDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, attendanceRes] = await Promise.all([
        fetch(`/api/portal/projects/${projectId}/groups`),
        fetch(`/api/portal/projects/${projectId}/attendance`),
      ]);

      if (groupsRes.ok) {
        const { groups: g } = await groupsRes.json();
        setGroups(g || []);
        if (!activeGroupId && g?.length > 0) {
          setActiveGroupId(g[0].id);
        }
      }

      if (attendanceRes.ok) {
        const { records } = await attendanceRes.json();
        const map: Record<string, AttendanceRecord> = {};
        for (const r of records || []) {
          map[`${r.student_id}_${r.date}`] = r;
        }
        setAttendance(map);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId, activeGroupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleAttendance(studentId: string, date: string) {
    const key = `${studentId}_${date}`;
    const current = attendance[key]?.status || null;

    const cycle: AttendanceStatus[] = [null, "present", "absent", "late"];
    const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
    const nextStatus = cycle[nextIndex];

    setSaving(key);

    // Optimistic update
    setAttendance((prev) => ({
      ...prev,
      [key]: { ...prev[key], student_id: studentId, date, status: nextStatus, id: prev[key]?.id || "" },
    }));

    try {
      await fetch(`/api/portal/projects/${projectId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, date, status: nextStatus }),
      });
    } catch {
      // Revert on failure
      setAttendance((prev) => ({
        ...prev,
        [key]: { ...prev[key], status: current },
      }));
    } finally {
      setSaving(null);
    }
  }

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    setAddingGroup(true);
    try {
      const res = await fetch(`/api/portal/projects/${projectId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGroup),
      });
      if (res.ok) {
        const { group } = await res.json();
        setGroups((prev) => [...prev, { ...group, project_students: [] }]);
        setActiveGroupId(group.id);
        setNewGroup({ name: "", grade: "", english_level: "" });
        setShowAddGroup(false);
      }
    } catch {
      // ignore
    } finally {
      setAddingGroup(false);
    }
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudent.first_name.trim() || !activeGroupId) return;
    setAddingStudent(true);
    try {
      const res = await fetch(`/api/portal/projects/${projectId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newStudent, group_id: activeGroupId }),
      });
      if (res.ok) {
        const { student } = await res.json();
        setGroups((prev) =>
          prev.map((g) =>
            g.id === activeGroupId
              ? { ...g, project_students: [...g.project_students, student] }
              : g
          )
        );
        setNewStudent({ first_name: "", last_name: "" });
      }
    } catch {
      // ignore
    } finally {
      setAddingStudent(false);
    }
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group tabs + Add group */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroupId(g.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeGroupId === g.id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {g.name}
            {g.grade && <span className="ml-1 text-xs opacity-60">({g.grade})</span>}
          </button>
        ))}
        <button
          onClick={() => setShowAddGroup(!showAddGroup)}
          className="shrink-0 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
        >
          + Add Group
        </button>
      </div>

      {/* Add group form */}
      {showAddGroup && (
        <form onSubmit={addGroup} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Group Name *</label>
              <input
                type="text"
                required
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder="e.g. Group A"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Grade</label>
              <input
                type="text"
                value={newGroup.grade}
                onChange={(e) => setNewGroup({ ...newGroup, grade: e.target.value })}
                placeholder="e.g. 9th"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">English Level</label>
              <input
                type="text"
                value={newGroup.english_level}
                onChange={(e) => setNewGroup({ ...newGroup, english_level: e.target.value })}
                placeholder="e.g. B1"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={addingGroup}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {addingGroup ? "Adding..." : "Add Group"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddGroup(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Attendance grid */}
      {activeGroup && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  Student
                </th>
                {weekdays.map((date) => (
                  <th key={date} className="px-2 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400">
                    <div className="text-[10px] leading-tight">{formatDateShort(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeGroup.project_students.map((student) => (
                <tr key={student.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 dark:bg-zinc-950">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-zinc-900 dark:text-zinc-100">
                        {student.first_name} {student.last_name}
                      </span>
                      {student.needs_notes && (
                        <span
                          title={student.needs_notes}
                          className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                        >
                          i
                        </span>
                      )}
                    </div>
                  </td>
                  {weekdays.map((date) => {
                    const key = `${student.id}_${date}`;
                    return (
                      <td key={date} className="px-2 py-2 text-center">
                        <div className="flex justify-center">
                          <StatusCell
                            status={attendance[key]?.status || null}
                            onClick={() => toggleAttendance(student.id, date)}
                            saving={saving === key}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Add student row */}
              <tr className="border-t border-zinc-200 dark:border-zinc-700">
                <td colSpan={weekdays.length + 1} className="px-4 py-3">
                  <form onSubmit={addStudent} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={newStudent.first_name}
                      onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                      placeholder="First name"
                      className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                    <input
                      type="text"
                      value={newStudent.last_name}
                      onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                      placeholder="Last name"
                      className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                    <button
                      type="submit"
                      disabled={addingStudent}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      {addingStudent ? "Adding..." : "+ Add Student"}
                    </button>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          No groups yet. Create a group to start taking attendance.
        </p>
      )}
    </div>
  );
}
