"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { TAProfileCard, type TAProfile } from "@/components/shared/ta-profile-card";

interface Project {
  id: string;
  name: string;
  school: string | null;
  school_address: string | null;
  location: string | null;
  program_type: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  status: string;
  notes: string | null;
  ta_name: string;
  work_order_id: string | null;
  teacher_email: string | null;
  teacher_name: string | null;
  teacher_invited_at: string | null;
}

interface TeamMember {
  ta_id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    preferred_name: string | null;
    photo_url: string | null;
    phone: string | null;
    phone_consent: boolean;
    where_from: string | null;
    moved_to_germany: string | null;
    likes_germany: string | null;
    vacation_spot: string | null;
    great_at: string | null;
    not_great_at: string | null;
    art_type: string | null;
    superpower: string | null;
    famous_last_words: string | null;
    dietary_restrictions: string | null;
    dietary_options: string[] | null;
    hometown_city: string | null;
    hometown_country: string | null;
  };
}

interface GroupSummary {
  id: string;
  name: string;
  student_count: number;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  required: boolean;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_url: string | null;
  content: string | null;
  doc_type: "file" | "native";
  published: boolean;
  visibility: "ta" | "teacher" | "both" | "admin";
  created_at: string;
}

const statusStyles: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminProjectView({
  project,
  tasks: initialTasks,
  documents: initialDocs,
  teamMembers = [],
  groupSummaries = [],
}: {
  project: Project;
  tasks: Task[];
  documents: Document[];
  teamMembers?: TeamMember[];
  groupSummaries?: GroupSummary[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [documents, setDocuments] = useState(initialDocs);
  const [notes, setNotes] = useState(project.notes || "");
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [nativeDocName, setNativeDocName] = useState("");
  const [nativeDocContent, setNativeDocContent] = useState("");
  const [savingNativeDoc, setSavingNativeDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add task form state
  const [newTask, setNewTask] = useState({ title: "", description: "", type: "checkbox", url: "", required: false });

  // Teacher invite state
  const [inviting, setInviting] = useState(false);
  const [teacherEmailInput, setTeacherEmailInput] = useState(project.teacher_email || "");
  const [teacherInvitedAt, setTeacherInvitedAt] = useState(project.teacher_invited_at);
  const [inviteError, setInviteError] = useState("");

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function saveNotesAndStatus() {
    setSaving(true);
    try {
      await fetch(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, status }),
      });
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function inviteTeacher() {
    setInviting(true);
    setInviteError("");
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/invite-teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_email: teacherEmailInput || undefined,
        }),
      });
      if (res.ok) {
        setTeacherInvitedAt(new Date().toISOString());
      } else {
        const data = await res.json();
        setInviteError(data.error || "Failed to send invite");
      }
    } catch {
      setInviteError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks((prev) => [...prev, task]);
        setNewTask({ title: "", description: "", type: "checkbox", url: "", required: false });
        setShowAddTask(false);
      }
    } catch {
      // ignore
    }
  }

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      const res = await fetch(`/api/admin/projects/${project.id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { document } = await res.json();
        setDocuments((prev) => [document, ...prev]);
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function createNativeDocument() {
    if (!nativeDocName.trim()) return;
    setSavingNativeDoc(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nativeDocName, content: nativeDocContent, doc_type: "native" }),
      });
      if (res.ok) {
        const { document } = await res.json();
        setDocuments((prev) => [document, ...prev]);
        setShowCreateDoc(false);
        setNativeDocName("");
        setNativeDocContent("");
      }
    } catch {
      // ignore
    } finally {
      setSavingNativeDoc(false);
    }
  }

  async function updateNativeDocument() {
    if (!editingDoc) return;
    setSavingNativeDoc(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/documents/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nativeDocName, content: nativeDocContent }),
      });
      if (res.ok) {
        const { document } = await res.json();
        setDocuments((prev) => prev.map((d) => (d.id === document.id ? document : d)));
        setEditingDoc(null);
        setNativeDocName("");
        setNativeDocContent("");
      }
    } catch {
      // ignore
    } finally {
      setSavingNativeDoc(false);
    }
  }

  function openEditDoc(doc: Document) {
    setEditingDoc(doc);
    setNativeDocName(doc.name);
    setNativeDocContent(doc.content || "");
    setShowCreateDoc(false);
  }

  async function togglePublish(docId: string, published: boolean) {
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      if (res.ok) {
        setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, published: !published } : d)));
      }
    } catch {
      // ignore
    }
  }

  async function changeVisibility(docId: string, visibility: string) {
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (res.ok) {
        setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, visibility: visibility as Document["visibility"] } : d)));
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link href="/admin/projects" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        &larr; Back to Projects
      </Link>

      {/* Project header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{project.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              <span>TA: {project.ta_name}</span>
              {project.school && <span>School: {project.school}</span>}
              {project.program_type && <span>Program: {project.program_type}</span>}
              {project.start_date && project.end_date && (
                <span>{formatDate(project.start_date)} — {formatDate(project.end_date)}</span>
              )}
              {project.days && <span>{project.days} day{project.days > 1 ? "s" : ""}</span>}
              {project.location && <span>Location: {project.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status] || ""}`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Team section */}
      {teamMembers.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Assigned TAs — School Profiles</h2>
            <div className="space-y-4">
              {teamMembers.map((m) => {
                if (!m.profile) return null;
                const taProfile: TAProfile = {
                  id: m.profile.id,
                  first_name: m.profile.first_name || "",
                  last_name: m.profile.last_name || "",
                  preferred_name: m.profile.preferred_name,
                  phone: m.profile.phone,
                  phone_consent: m.profile.phone_consent,
                  photo_url: m.profile.photo_url,
                  where_from: m.profile.where_from,
                  moved_to_germany: m.profile.moved_to_germany,
                  likes_germany: m.profile.likes_germany,
                  vacation_spot: m.profile.vacation_spot,
                  great_at: m.profile.great_at,
                  not_great_at: m.profile.not_great_at,
                  art_type: m.profile.art_type,
                  superpower: m.profile.superpower,
                  famous_last_words: m.profile.famous_last_words,
                  dietary_restrictions: m.profile.dietary_restrictions,
                  dietary_options: m.profile.dietary_options,
                  hometown_city: m.profile.hometown_city,
                  hometown_country: m.profile.hometown_country,
                };
                return (
                  <TAProfileCard key={m.ta_id} profile={taProfile} variant="school" />
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Assigned TAs — Homestay Profiles</h2>
            <div className="space-y-4">
              {teamMembers.map((m) => {
                if (!m.profile) return null;
                const taProfile: TAProfile = {
                  id: m.profile.id,
                  first_name: m.profile.first_name || "",
                  last_name: m.profile.last_name || "",
                  preferred_name: m.profile.preferred_name,
                  phone: m.profile.phone,
                  phone_consent: m.profile.phone_consent,
                  photo_url: m.profile.photo_url,
                  where_from: m.profile.where_from,
                  moved_to_germany: m.profile.moved_to_germany,
                  likes_germany: m.profile.likes_germany,
                  vacation_spot: m.profile.vacation_spot,
                  great_at: m.profile.great_at,
                  not_great_at: m.profile.not_great_at,
                  art_type: m.profile.art_type,
                  superpower: m.profile.superpower,
                  famous_last_words: m.profile.famous_last_words,
                  dietary_restrictions: m.profile.dietary_restrictions,
                  dietary_options: m.profile.dietary_options,
                  hometown_city: m.profile.hometown_city,
                  hometown_country: m.profile.hometown_country,
                };
                return (
                  <TAProfileCard key={m.ta_id} profile={taProfile} variant="homestay" />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Teacher invite section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Teacher / School Contact</h2>
        <div className="space-y-3">
          {project.teacher_name && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">Name:</span> {project.teacher_name}
            </p>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Teacher Email</label>
              <input
                type="email"
                value={teacherEmailInput}
                onChange={(e) => setTeacherEmailInput(e.target.value)}
                placeholder="teacher@school.de"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </div>
            <button
              onClick={inviteTeacher}
              disabled={inviting || !teacherEmailInput.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {inviting ? "Sending..." : teacherInvitedAt ? "Resend Invite" : "Invite Teacher"}
            </button>
          </div>
          {teacherInvitedAt && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Invited on {new Date(teacherInvitedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {inviteError && (
            <p className="text-xs text-red-600 dark:text-red-400">{inviteError}</p>
          )}
        </div>
      </div>

      {/* Attendance summary */}
      {groupSummaries.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Attendance</h2>
            <Link
              href={`/admin/projects/${project.id}#attendance`}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              View full attendance
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupSummaries.map((g) => (
              <div key={g.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{g.name}</p>
                <p className="text-xs text-zinc-500">{g.student_count} student{g.student_count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {groupSummaries.length} group{groupSummaries.length !== 1 ? "s" : ""}, {groupSummaries.reduce((sum, g) => sum + g.student_count, 0)} total students
          </p>
        </div>
      )}

      {/* Tasks section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tasks</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{completedCount}/{totalCount} completed</span>
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add Task
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">{progress}% complete</p>
          </div>
        )}

        {/* Add task form */}
        {showAddTask && (
          <form onSubmit={addTask} className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Title</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <option value="checkbox">Checkbox</option>
                  <option value="link">Link</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>
              {newTask.type === "link" && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">URL</label>
                  <input
                    type="url"
                    value={newTask.url}
                    onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>
              )}
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newTask.required}
                  onChange={(e) => setNewTask({ ...newTask, required: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <label htmlFor="required" className="text-sm text-zinc-600 dark:text-zinc-400">Required task</label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddTask(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    task.completed
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {task.completed && (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {task.type === "link" && task.url ? (
                      <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm font-medium hover:underline ${
                          task.completed ? "text-zinc-400 line-through" : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {task.title}
                      </a>
                    ) : (
                      <span className={`text-sm font-medium ${task.completed ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}>
                        {task.title}
                      </span>
                    )}
                    {task.required && (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                  {task.description && <p className="mt-0.5 text-xs text-zinc-500">{task.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Documents section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Documents</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowCreateDoc(true); setEditingDoc(null); setNativeDocName(""); setNativeDocContent(""); }}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create Document
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={uploadDocument}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>

        {/* Create / Edit native document form */}
        {(showCreateDoc || editingDoc) && (
          <div className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {editingDoc ? "Edit Document" : "Create Document"}
            </h3>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Document Name</label>
              <input
                type="text"
                value={nativeDocName}
                onChange={(e) => setNativeDocName(e.target.value)}
                placeholder="Document title..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Content</label>
              <RichTextEditor
                content={nativeDocContent}
                onChange={setNativeDocContent}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={editingDoc ? updateNativeDocument : createNativeDocument}
                disabled={savingNativeDoc || !nativeDocName.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {savingNativeDoc ? "Saving..." : editingDoc ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateDoc(false); setEditingDoc(null); setNativeDocName(""); setNativeDocContent(""); }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No documents yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">Document</th>
                  <th className="px-4 py-2 text-center font-medium text-zinc-500 w-16">TA</th>
                  <th className="px-4 py-2 text-center font-medium text-zinc-500 w-16">Teacher</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {documents.map((doc) => {
                  const taOn = doc.visibility === "ta" || doc.visibility === "both";
                  const teacherOn = doc.visibility === "teacher" || doc.visibility === "both";
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">{doc.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${doc.published ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                            {doc.published ? "Live" : "Draft"}
                          </span>
                          {!taOn && !teacherOn && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-700">Admin only</span>
                          )}
                        </div>
                        {doc.description && <p className="text-xs text-zinc-500">{doc.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={taOn}
                          onChange={() => {
                            const newTa = !taOn;
                            const vis = newTa && teacherOn ? "both" : newTa ? "ta" : teacherOn ? "teacher" : "admin";
                            changeVisibility(doc.id, vis);
                          }}
                          className="h-4 w-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={teacherOn}
                          onChange={() => {
                            const newTeacher = !teacherOn;
                            const vis = taOn && newTeacher ? "both" : taOn ? "ta" : newTeacher ? "teacher" : "admin";
                            changeVisibility(doc.id, vis);
                          }}
                          className="h-4 w-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => togglePublish(doc.id, doc.published)}
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            {doc.published ? "Unpublish" : "Publish"}
                          </button>
                          {doc.doc_type === "native" ? (
                            <button
                              onClick={() => openEditDoc(doc)}
                              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Edit
                            </button>
                          ) : doc.file_url ? (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              Download
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Internal Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          placeholder="Add internal notes about this project..."
        />
        <div className="mt-3">
          <button
            onClick={saveNotesAndStatus}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
