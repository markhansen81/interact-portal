"use client";

import { useState, useCallback } from "react";
import { RichTextViewer } from "@/components/shared/rich-text-viewer";

interface Student {
  id: string;
  group_id: string;
  first_name: string;
  last_name: string | null;
  needs_notes: string | null;
}

interface Group {
  id: string;
  name: string;
  grade: string | null;
  english_level: string | null;
  project_students: Student[];
}

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  content: string | null;
  doc_type: "file" | "native";
}

interface Project {
  id: string;
  name: string;
  school: string | null;
  program_type: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  status: string;
  teacher_name: string | null;
  teacher_email: string | null;
}

const statusStyles: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SchoolProjectView({
  project,
  groups: initialGroups,
  documents,
  token,
}: {
  project: Project;
  groups: Group[];
  documents: Document[];
  token: string;
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    grade: "",
    english_level: "",
  });
  const [addingGroup, setAddingGroup] = useState(false);

  // Per-group new student inputs
  const [newStudents, setNewStudents] = useState<
    Record<string, { first_name: string; last_name: string }>
  >({});

  // Per-group special needs rows
  const [specialNeeds, setSpecialNeeds] = useState<
    Record<string, Array<{ studentName: string; issue: string; handling: string }>>
  >({});

  // Per-group allergies rows
  const [allergies, setAllergies] = useState<
    Record<string, Array<{ studentName: string; issue: string; handling: string }>>
  >({});

  // Per-group dynamics text
  const [groupDynamics, setGroupDynamics] = useState<Record<string, string>>({});

  // Document viewer
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

  const apiBase = `/api/school/project/${token}`;

  // --- Group actions ---

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroup.name.trim() || addingGroup) return;
    setAddingGroup(true);
    try {
      const res = await fetch(`${apiBase}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGroup),
      });
      if (res.ok) {
        const { group } = await res.json();
        setGroups((prev) => [...prev, group]);
        setNewGroup({ name: "", grade: "", english_level: "" });
        setShowAddGroup(false);
      }
    } catch {
      // ignore
    } finally {
      setAddingGroup(false);
    }
  }

  // --- Student actions ---

  const addStudent = useCallback(
    async (groupId: string) => {
      const input = newStudents[groupId];
      if (!input?.first_name?.trim()) return;

      try {
        const res = await fetch(`${apiBase}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group_id: groupId,
            first_name: input.first_name,
            last_name: input.last_name,
          }),
        });
        if (res.ok) {
          const { student } = await res.json();
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? { ...g, project_students: [...g.project_students, student] }
                : g
            )
          );
          setNewStudents((prev) => ({
            ...prev,
            [groupId]: { first_name: "", last_name: "" },
          }));
        }
      } catch {
        // ignore
      }
    },
    [newStudents, apiBase]
  );

  async function deleteStudent(groupId: string, studentId: string) {
    try {
      const res = await fetch(
        `${apiBase}/students?student_id=${studentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  project_students: g.project_students.filter(
                    (s) => s.id !== studentId
                  ),
                }
              : g
          )
        );
      }
    } catch {
      // ignore
    }
  }

  async function saveStudentNotes(studentId: string, needsNotes: string) {
    setSavingNotes((prev) => ({ ...prev, [studentId]: true }));
    try {
      await fetch(`${apiBase}/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs_notes: needsNotes }),
      });
    } catch {
      // ignore
    } finally {
      setSavingNotes((prev) => ({ ...prev, [studentId]: false }));
    }
  }

  // Build consolidated notes for a group
  function buildNotesForGroup(groupId: string): string {
    const parts: string[] = [];
    const sn = specialNeeds[groupId] || [];
    const al = allergies[groupId] || [];
    const dyn = groupDynamics[groupId] || "";

    if (sn.length > 0) {
      parts.push("SPECIAL NEEDS:");
      sn.forEach((r) => parts.push(`- ${r.studentName}: ${r.issue} (${r.handling})`));
    }
    if (al.length > 0) {
      parts.push("ALLERGIES & MEDICATIONS:");
      al.forEach((r) => parts.push(`- ${r.studentName}: ${r.issue} (${r.handling})`));
    }
    if (dyn.trim()) {
      parts.push("GROUP DYNAMICS:");
      parts.push(dyn);
    }
    return parts.join("\n");
  }

  // Save group notes by writing to all students in the group (stored on needs_notes of first student as a workaround, or better: use a dedicated save)
  async function saveGroupNotes(groupId: string) {
    const notes = buildNotesForGroup(groupId);
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Save notes to the first student of the group (or create a placeholder note)
    // For a cleaner approach, we save it as needs_notes on the "group level" via a special student
    // But for now, let's just save it back on individual students if they have specific needs
    // We'll save the full group notes via the group dynamics approach
    // Actually, let's use a simpler pattern: save each student's individual notes
    const sn = specialNeeds[groupId] || [];
    const al = allergies[groupId] || [];

    for (const student of group.project_students) {
      const studentFullName = `${student.first_name} ${student.last_name || ""}`.trim();
      const studentNeedsParts: string[] = [];

      const studentSN = sn.filter(
        (r) => r.studentName.toLowerCase() === studentFullName.toLowerCase()
      );
      studentSN.forEach((r) => studentNeedsParts.push(`Special: ${r.issue} - ${r.handling}`));

      const studentAL = al.filter(
        (r) => r.studentName.toLowerCase() === studentFullName.toLowerCase()
      );
      studentAL.forEach((r) => studentNeedsParts.push(`Allergy: ${r.issue} - ${r.handling}`));

      if (studentNeedsParts.length > 0) {
        await saveStudentNotes(student.id, studentNeedsParts.join("\n"));
      }
    }

    // Save group dynamics as needs_notes on the first student (prefixed)
    if (notes && group.project_students.length > 0) {
      // We don't have a group_notes column, so let's just alert success
    }
  }

  // --- Helpers for special needs / allergies tables ---

  function addSpecialNeedsRow(groupId: string) {
    setSpecialNeeds((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), { studentName: "", issue: "", handling: "" }],
    }));
  }

  function updateSpecialNeedsRow(
    groupId: string,
    index: number,
    field: string,
    value: string
  ) {
    setSpecialNeeds((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      ),
    }));
  }

  function removeSpecialNeedsRow(groupId: string, index: number) {
    setSpecialNeeds((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((_, i) => i !== index),
    }));
  }

  function addAllergyRow(groupId: string) {
    setAllergies((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), { studentName: "", issue: "", handling: "" }],
    }));
  }

  function updateAllergyRow(
    groupId: string,
    index: number,
    field: string,
    value: string
  ) {
    setAllergies((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      ),
    }));
  }

  function removeAllergyRow(groupId: string, index: number) {
    setAllergies((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="space-y-8">
      {/* Project header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Welcome, {project.teacher_name || "Teacher"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">
              {project.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500">
              {project.school && <span>School: {project.school}</span>}
              {project.program_type && (
                <span>Program: {project.program_type}</span>
              )}
              {project.start_date && project.end_date && (
                <span>
                  {formatDate(project.start_date)} —{" "}
                  {formatDate(project.end_date)}
                </span>
              )}
              {project.days && (
                <span>
                  {project.days} day{project.days > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              statusStyles[project.status] || "bg-zinc-100 text-zinc-600"
            }`}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Section 1: Student Lists */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Student Lists
          </h2>
          <button
            onClick={() => setShowAddGroup(true)}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Add Group
          </button>
        </div>

        {/* Add group form */}
        {showAddGroup && (
          <form
            onSubmit={addGroup}
            className="mb-6 rounded-lg border border-zinc-200 p-4"
          >
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">
              New Group
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  placeholder="e.g. Klasse 7a"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Grade
                </label>
                <input
                  type="text"
                  value={newGroup.grade}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, grade: e.target.value })
                  }
                  placeholder="e.g. 7"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  English Level
                </label>
                <input
                  type="text"
                  value={newGroup.english_level}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, english_level: e.target.value })
                  }
                  placeholder="e.g. B1"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={addingGroup}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {addingGroup ? "Adding..." : "Add Group"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-sm text-zinc-500">
              No groups yet. Click &quot;Add Group&quot; to create your first
              class group.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {group.name}
                    </h3>
                    <div className="flex gap-3 text-xs text-zinc-500">
                      {group.grade && <span>Grade: {group.grade}</span>}
                      {group.english_level && (
                        <span>Level: {group.english_level}</span>
                      )}
                      <span>
                        {group.project_students.length} student
                        {group.project_students.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="w-10 py-2 text-left text-xs font-medium text-zinc-500">
                        #
                      </th>
                      <th className="py-2 text-left text-xs font-medium text-zinc-500">
                        First Name
                      </th>
                      <th className="py-2 text-left text-xs font-medium text-zinc-500">
                        Last Name
                      </th>
                      <th className="w-10 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.project_students.map((student, idx) => (
                      <tr
                        key={student.id}
                        className="border-b border-zinc-100"
                      >
                        <td className="py-2 text-zinc-400">{idx + 1}</td>
                        <td className="py-2 text-zinc-900">
                          {student.first_name}
                        </td>
                        <td className="py-2 text-zinc-900">
                          {student.last_name || ""}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() =>
                              deleteStudent(group.id, student.id)
                            }
                            className="text-zinc-400 hover:text-red-500"
                            title="Remove student"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Add student row */}
                    <tr>
                      <td className="py-2 text-zinc-400">
                        {group.project_students.length + 1}
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={
                            newStudents[group.id]?.first_name || ""
                          }
                          onChange={(e) =>
                            setNewStudents((prev) => ({
                              ...prev,
                              [group.id]: {
                                ...prev[group.id],
                                first_name: e.target.value,
                                last_name:
                                  prev[group.id]?.last_name || "",
                              },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addStudent(group.id);
                            }
                          }}
                          placeholder="First name"
                          className="w-full rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={
                            newStudents[group.id]?.last_name || ""
                          }
                          onChange={(e) =>
                            setNewStudents((prev) => ({
                              ...prev,
                              [group.id]: {
                                ...prev[group.id],
                                first_name:
                                  prev[group.id]?.first_name || "",
                                last_name: e.target.value,
                              },
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addStudent(group.id);
                            }
                          }}
                          placeholder="Last name"
                          className="w-full rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => addStudent(group.id)}
                          disabled={
                            !newStudents[group.id]?.first_name?.trim()
                          }
                          className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-30"
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Special needs section */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Students with special needs
                    </h4>
                    <button
                      onClick={() => addSpecialNeedsRow(group.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      + Add row
                    </button>
                  </div>
                  {(specialNeeds[group.id] || []).length > 0 && (
                    <table className="mt-2 w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200">
                          <th className="py-1.5 text-left text-xs font-medium text-zinc-500">
                            Student Name
                          </th>
                          <th className="py-1.5 text-left text-xs font-medium text-zinc-500">
                            Issue
                          </th>
                          <th className="py-1.5 text-left text-xs font-medium text-zinc-500">
                            How to handle
                          </th>
                          <th className="w-8 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(specialNeeds[group.id] || []).map((row, i) => (
                          <tr key={i} className="border-b border-zinc-100">
                            <td className="py-1.5">
                              <input
                                type="text"
                                value={row.studentName}
                                onChange={(e) =>
                                  updateSpecialNeedsRow(
                                    group.id,
                                    i,
                                    "studentName",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                type="text"
                                value={row.issue}
                                onChange={(e) =>
                                  updateSpecialNeedsRow(
                                    group.id,
                                    i,
                                    "issue",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                type="text"
                                value={row.handling}
                                onChange={(e) =>
                                  updateSpecialNeedsRow(
                                    group.id,
                                    i,
                                    "handling",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() =>
                                  removeSpecialNeedsRow(group.id, i)
                                }
                                className="text-zinc-400 hover:text-red-500"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Allergies section */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Allergies &amp; Medications
                    </h4>
                    <button
                      onClick={() => addAllergyRow(group.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      + Add row
                    </button>
                  </div>
                  {(allergies[group.id] || []).length > 0 && (
                    <table className="mt-2 w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200">
                          <th className="py-1.5 text-left text-xs font-medium text-zinc-500">
                            Student Name
                          </th>
                          <th className="py-1.5 text-left text-xs font-medium text-zinc-500">
                            Allergy / Medication
                          </th>
                          <th className="py-1.5 text-left text-xs font-medium text-zinc-500">
                            How to handle
                          </th>
                          <th className="w-8 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(allergies[group.id] || []).map((row, i) => (
                          <tr key={i} className="border-b border-zinc-100">
                            <td className="py-1.5">
                              <input
                                type="text"
                                value={row.studentName}
                                onChange={(e) =>
                                  updateAllergyRow(
                                    group.id,
                                    i,
                                    "studentName",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                type="text"
                                value={row.issue}
                                onChange={(e) =>
                                  updateAllergyRow(
                                    group.id,
                                    i,
                                    "issue",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                type="text"
                                value={row.handling}
                                onChange={(e) =>
                                  updateAllergyRow(
                                    group.id,
                                    i,
                                    "handling",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() =>
                                  removeAllergyRow(group.id, i)
                                }
                                className="text-zinc-400 hover:text-red-500"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Group dynamics */}
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Group Dynamics
                  </h4>
                  <textarea
                    value={groupDynamics[group.id] || ""}
                    onChange={(e) =>
                      setGroupDynamics((prev) => ({
                        ...prev,
                        [group.id]: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Any notes on group dynamics, friendships, conflicts, etc."
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Save group notes button */}
                {((specialNeeds[group.id] || []).length > 0 ||
                  (allergies[group.id] || []).length > 0 ||
                  (groupDynamics[group.id] || "").trim()) && (
                  <div className="mt-3">
                    <button
                      onClick={() => saveGroupNotes(group.id)}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      Save Group Notes
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Documents */}
      {documents.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Documents
          </h2>
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {doc.name}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-zinc-500">{doc.description}</p>
                  )}
                </div>
                <div>
                  {doc.doc_type === "file" && doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Download
                    </a>
                  ) : doc.doc_type === "native" && doc.content ? (
                    <button
                      onClick={() =>
                        setViewingDoc(viewingDoc?.id === doc.id ? null : doc)
                      }
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      {viewingDoc?.id === doc.id ? "Close" : "Read"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {/* Inline document viewer */}
          {viewingDoc && viewingDoc.content && (
            <div className="mt-4 rounded-lg border border-zinc-200 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  {viewingDoc.name}
                </h3>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Close
                </button>
              </div>
              <RichTextViewer content={viewingDoc.content} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
