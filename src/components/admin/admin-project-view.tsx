"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { TAProfileCard, type TAProfile } from "@/components/shared/ta-profile-card";
import { StaffingWizard } from "@/components/admin/staffing-wizard";

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
  price_pp: number | null;
  deposit_enabled: boolean | null;
  deposit_type: "percentage" | "fixed" | null;
  deposit_value: number | null;
}

interface SchoolInvoice {
  id: string;
  project_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  num_students: number;
  price_pp: number;
  total: number;
  status: string;
  invoice_type: "full" | "deposit" | "final";
  deposit_amount: number | null;
  pdf_url: string | null;
  sent_at: string | null;
  sent_to: string | null;
  paid_at: string | null;
  notes: string | null;
  contact_person: string | null;
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

interface AdminTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
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
  adminTasks: initialAdminTasks = [],
  schoolInvoices: initialInvoices = [],
}: {
  project: Project;
  tasks: Task[];
  documents: Document[];
  teamMembers?: TeamMember[];
  groupSummaries?: GroupSummary[];
  adminTasks?: AdminTask[];
  schoolInvoices?: SchoolInvoice[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [documents, setDocuments] = useState(initialDocs);
  const [adminTasks, setAdminTasks] = useState(initialAdminTasks);
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
  const [showStaffingWizard, setShowStaffingWizard] = useState(false);
  const [showAddAdminTask, setShowAddAdminTask] = useState(false);
  const [newAdminTaskTitle, setNewAdminTaskTitle] = useState("");
  const [newAdminTaskDesc, setNewAdminTaskDesc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Invoice state
  const [invoices, setInvoices] = useState(initialInvoices);
  const [invoiceStudents, setInvoiceStudents] = useState(
    groupSummaries.reduce((sum, g) => sum + g.student_count, 0) || 0
  );
  const [invoicePricePP, setInvoicePricePP] = useState(project.price_pp || 0);
  const [invoiceContactPerson, setInvoiceContactPerson] = useState("Justin Beard");
  const [invoiceFinanceEmail, setInvoiceFinanceEmail] = useState("");
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [depositEnabled, setDepositEnabled] = useState(project.deposit_enabled || false);
  const [depositType, setDepositType] = useState<"percentage" | "fixed">(project.deposit_type || "percentage");
  const [depositValue, setDepositValue] = useState(project.deposit_value || 50);

  const fullTotal = invoiceStudents * invoicePricePP;
  const depositAmount = depositEnabled
    ? depositType === "percentage" ? Math.round(fullTotal * depositValue / 100 * 100) / 100 : depositValue
    : 0;
  const finalAmount = fullTotal - depositAmount;
  const hasDeposit = invoices.some((inv) => inv.invoice_type === "deposit");
  const hasFinal = invoices.some((inv) => inv.invoice_type === "final");

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

  // Admin task progress
  const adminCompleted = adminTasks.filter((t) => t.completed).length;
  const adminTotal = adminTasks.length;
  const adminProgress = adminTotal > 0 ? Math.round((adminCompleted / adminTotal) * 100) : 0;

  async function toggleAdminTask(taskId: string) {
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/admin-tasks/${taskId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        const { task } = await res.json();
        setAdminTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
      }
    } catch {
      // ignore
    }
  }

  async function addAdminTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/admin-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAdminTaskTitle,
          description: newAdminTaskDesc || null,
          sort_order: adminTasks.length + 1,
        }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setAdminTasks((prev) => [...prev, task]);
        setNewAdminTaskTitle("");
        setNewAdminTaskDesc("");
        setShowAddAdminTask(false);
      }
    } catch {
      // ignore
    }
  }

  function handleStaffingComplete() {
    // Mark the "Staff project" admin task as complete
    const staffTask = adminTasks.find(
      (t) => t.title.toLowerCase().includes("staff project") && !t.completed
    );
    if (staffTask) {
      toggleAdminTask(staffTask.id);
    }
  }

  async function generateInvoice(type: "full" | "deposit" | "final" = "full") {
    setGeneratingInvoice(true);
    setInvoiceError("");
    try {
      const invoiceTotal = type === "deposit" ? depositAmount : type === "final" ? finalAmount : fullTotal;
      const res = await fetch(`/api/admin/projects/${project.id}/school-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          num_students: invoiceStudents,
          price_pp: invoicePricePP,
          contact_person: invoiceContactPerson,
          sent_to: invoiceFinanceEmail || undefined,
          invoice_type: type,
          deposit_amount: type !== "full" ? depositAmount : undefined,
          total_override: invoiceTotal,
        }),
      });
      if (res.ok) {
        const { invoice } = await res.json();
        setInvoices((prev) => [invoice, ...prev]);
      } else {
        const data = await res.json();
        setInvoiceError(data.error || "Failed to generate invoice");
      }
    } catch {
      setInvoiceError("Failed to generate invoice");
    } finally {
      setGeneratingInvoice(false);
    }
  }

  async function sendInvoice(invoiceId: string) {
    if (!invoiceFinanceEmail.trim()) {
      setInvoiceError("Please enter a finance email");
      return;
    }
    setSendingInvoice(true);
    setInvoiceError("");
    try {
      const res = await fetch(
        `/api/admin/projects/${project.id}/school-invoice/${invoiceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", sent_to: invoiceFinanceEmail }),
        }
      );
      if (res.ok) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoiceId
              ? { ...inv, status: "sent", sent_at: new Date().toISOString(), sent_to: invoiceFinanceEmail }
              : inv
          )
        );
      } else {
        const data = await res.json();
        setInvoiceError(data.error || "Failed to send invoice");
      }
    } catch {
      setInvoiceError("Failed to send invoice");
    } finally {
      setSendingInvoice(false);
    }
  }

  async function markInvoicePaid(invoiceId: string) {
    try {
      const res = await fetch(
        `/api/admin/projects/${project.id}/school-invoice/${invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paid" }),
        }
      );
      if (res.ok) {
        const { invoice } = await res.json();
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoiceId ? invoice : inv))
        );
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

      {/* Invoice section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Invoice</h2>

        {invoices.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                Calculated: <strong>{invoiceStudents}</strong> students x <strong>{"\u20AC"}{invoicePricePP.toFixed(2)}</strong> = <strong>{"\u20AC"}{(invoiceStudents * invoicePricePP).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</strong>
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Students</label>
                  <input
                    type="number"
                    value={invoiceStudents}
                    onChange={(e) => setInvoiceStudents(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Price per Student</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoicePricePP}
                    onChange={(e) => setInvoicePricePP(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Contact Person</label>
                  <input
                    type="text"
                    value={invoiceContactPerson}
                    onChange={(e) => setInvoiceContactPerson(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Finance Email</label>
                  <input
                    type="email"
                    value={invoiceFinanceEmail}
                    onChange={(e) => setInvoiceFinanceEmail(e.target.value)}
                    placeholder="finance@school.de"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
            </div>
            {/* Deposit toggle */}
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={depositEnabled}
                  onChange={(e) => setDepositEnabled(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Require deposit (Anzahlung)</span>
              </label>
              {depositEnabled && (
                <div className="mt-3 flex items-center gap-3">
                  <select
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value as "percentage" | "fixed")}
                    className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                  <input
                    type="number"
                    value={depositValue}
                    onChange={(e) => setDepositValue(parseFloat(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-500">{depositType === "percentage" ? "%" : "EUR"}</span>
                </div>
              )}
            </div>

            {/* Totals summary */}
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Full amount:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">€{fullTotal.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                </div>
                {depositEnabled && (
                  <>
                    <div className="flex justify-between text-blue-600">
                      <span>Deposit ({depositType === "percentage" ? `${depositValue}%` : "fixed"}):</span>
                      <span className="font-semibold">€{depositAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Remainder:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">€{finalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Generate buttons */}
            <div className="flex gap-2">
              {depositEnabled ? (
                <>
                  <button
                    onClick={() => generateInvoice("deposit")}
                    disabled={generatingInvoice || !invoiceStudents || !invoicePricePP || hasDeposit}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {hasDeposit ? "Deposit Created" : generatingInvoice ? "Generating..." : "Generate Deposit Invoice"}
                  </button>
                  <button
                    onClick={() => generateInvoice("final")}
                    disabled={generatingInvoice || !invoiceStudents || !invoicePricePP || hasFinal}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {hasFinal ? "Final Created" : generatingInvoice ? "Generating..." : "Generate Final Invoice"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => generateInvoice("full")}
                  disabled={generatingInvoice || !invoiceStudents || !invoicePricePP}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {generatingInvoice ? "Generating..." : "Generate Invoice"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => {
              const statusBadge: Record<string, string> = {
                draft: "bg-zinc-100 text-zinc-600",
                sent: "bg-blue-100 text-blue-700",
                paid: "bg-green-100 text-green-700",
                overdue: "bg-red-100 text-red-700",
              };
              return (
                <div key={inv.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {inv.invoice_number}
                        </span>
                        {inv.invoice_type !== "full" && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${inv.invoice_type === "deposit" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {inv.invoice_type === "deposit" ? "Anzahlung" : "Restzahlung"}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge[inv.status] || statusBadge.draft}`}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {"\u20AC"}{inv.total.toLocaleString("de-DE", { minimumFractionDigits: 2 })} &mdash; Due: {new Date(inv.due_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {inv.sent_at && (
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Sent to {inv.sent_to} on {new Date(inv.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                      {inv.paid_at && (
                        <p className="mt-0.5 text-xs text-green-600">
                          Paid on {new Date(inv.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.pdf_url && (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Download PDF
                        </a>
                      )}
                      {inv.status !== "paid" && (
                        <button
                          onClick={() => markInvoicePaid(inv.id)}
                          className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>

                  {inv.status !== "paid" && (
                    <div className="mt-3 flex items-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-zinc-500">Send to email</label>
                        <input
                          type="email"
                          value={invoiceFinanceEmail}
                          onChange={(e) => setInvoiceFinanceEmail(e.target.value)}
                          placeholder="finance@school.de"
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        />
                      </div>
                      <button
                        onClick={() => sendInvoice(inv.id)}
                        disabled={sendingInvoice || !invoiceFinanceEmail.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {sendingInvoice ? "Sending..." : "Send to School"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {invoiceError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{invoiceError}</p>
        )}
      </div>

      {/* Admin Coordination section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Admin Coordination</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{adminCompleted}/{adminTotal} completed</span>
            <button
              onClick={() => setShowStaffingWizard(true)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Staff Project
            </button>
            <button
              onClick={() => setShowAddAdminTask(!showAddAdminTask)}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add Task
            </button>
          </div>
        </div>

        {/* Admin progress bar */}
        {adminTotal > 0 && (
          <div className="mb-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${adminProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">{adminProgress}% complete</p>
          </div>
        )}

        {/* Add admin task form */}
        {showAddAdminTask && (
          <form onSubmit={addAdminTask} className="mb-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Title</label>
                <input
                  type="text"
                  required
                  value={newAdminTaskTitle}
                  onChange={(e) => setNewAdminTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  placeholder="Task title..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
                <input
                  type="text"
                  value={newAdminTaskDesc}
                  onChange={(e) => setNewAdminTaskDesc(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddAdminTask(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {adminTasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No admin tasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {adminTasks.map((task) => {
              const isStaffTask = task.title.toLowerCase().includes("staff project");
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <button
                    onClick={() => toggleAdminTask(task.id)}
                    className="flex-shrink-0"
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        task.completed
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600"
                      }`}
                    >
                      {task.completed && (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${task.completed ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}>
                      {task.title}
                    </span>
                    {task.description && <p className="mt-0.5 text-xs text-zinc-500">{task.description}</p>}
                  </div>
                  {isStaffTask && !task.completed && (
                    <button
                      onClick={() => setShowStaffingWizard(true)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Staff
                    </button>
                  )}
                  {task.completed && task.completed_at && (
                    <span className="text-[10px] text-zinc-400">
                      {new Date(task.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Staffing Wizard Modal */}
      {showStaffingWizard && (
        <StaffingWizard
          project={project}
          onClose={() => setShowStaffingWizard(false)}
          onComplete={handleStaffingComplete}
        />
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
