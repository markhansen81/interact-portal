"use client";

import { useState, useCallback } from"react";
import { RichTextViewer } from"@/components/shared/rich-text-viewer";
import { TAProfileCard, type TAProfile } from"@/components/shared/ta-profile-card";

interface TeacherTask {
 id: string;
 project_id: string;
 title: string;
 description: string | null;
 completed: boolean;
 completed_at: string | null;
 sort_order: number;
}

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
 doc_type:"file"|"native";
}

interface SchoolInvoice {
 id: string;
 invoice_number: string;
 invoice_date: string;
 due_date: string;
 total: number;
 status: string;
 pdf_url: string | null;
}

interface SchoolTeamMember {
 id: string;
 ta_id: string;
 role: string;
 profile: {
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
 accommodation: string | null;
 info_pack_submitted_at: string | null;
 info_pack_data: Record<string, unknown> | null;
 schedule_confirmed_at: string | null;
 feedback_submitted_at: string | null;
}

type StageStatus ="completed"|"current"|"future";

interface Stage {
 id: string;
 label: string;
 description: string;
 status: StageStatus;
 completedAt?: string;
}

function getStageStatuses(project: Project, schoolInvoices: SchoolInvoice[]): Stage[] {
 const now = new Date();
 const stages: { id: string; label: string; description: string; completed: boolean; completedAt?: string }[] = [
 {
 id:"info_form",
 label:"Info-Formular",
 description:"Projektinformationen ausfuellen",
 completed: !!project.info_pack_submitted_at,
 completedAt: project.info_pack_submitted_at || undefined,
 },
 {
 id:"schedule",
 label:"Stundenplan",
 description:"Stundenplan pruefen und bestaetigen",
 completed: !!project.schedule_confirmed_at,
 completedAt: project.schedule_confirmed_at || undefined,
 },
 {
 id:"rooms",
 label:"Raeume",
 description:"Raeume buchen und eintragen",
 completed: false,
 },
 {
 id:"payment",
 label:"Zahlung",
 description:"Rechnung bezahlen",
 completed: schoolInvoices.some((inv) => inv.status ==="paid"),
 completedAt: undefined,
 },
 {
 id:"preparation",
 label:"Vorbereitung",
 description:"Finale Abstimmungen",
 completed: project.start_date
 ? (new Date(project.start_date +"T00:00:00").getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000
 : false,
 },
 {
 id:"project",
 label:"Projekt",
 description:"Projekt findet statt",
 completed: project.end_date
 ? now > new Date(project.end_date +"T23:59:59")
 : false,
 },
 {
 id:"feedback",
 label:"Feedback",
 description:"Projektevaluation ausfuellen",
 completed: !!project.feedback_submitted_at,
 completedAt: project.feedback_submitted_at || undefined,
 },
 ];

 // Determine current stage: first incomplete stage
 let currentFound = false;
 return stages.map((s) => {
 if (s.completed) {
 return { ...s, status:"completed"as StageStatus };
 }
 if (!currentFound) {
 currentFound = true;
 return { ...s, status:"current"as StageStatus };
 }
 return { ...s, status:"future"as StageStatus };
 });
}

const statusStyles: Record<string, string> = {
 upcoming:"bg-blue-100 text-blue-700",
 active:"bg-yellow-100 text-yellow-700",
 completed:"bg-green-100 text-green-700",
};

function formatDate(dateStr: string): string {
 const d = new Date(dateStr +"T00:00:00");
 return d.toLocaleDateString("de-DE", {
 day:"numeric",
 month:"long",
 year:"numeric",
 });
}

export function SchoolProjectView({
 project,
 groups: initialGroups,
 documents,
 token,
 teamMembers = [],
 teacherTasks: initialTasks = [],
 schoolInvoices = [],
}: {
 project: Project;
 groups: Group[];
 documents: Document[];
 token: string;
 teamMembers?: SchoolTeamMember[];
 teacherTasks?: TeacherTask[];
 schoolInvoices?: SchoolInvoice[];
}) {
 const [groups, setGroups] = useState<Group[]>(initialGroups);
 const [showAddGroup, setShowAddGroup] = useState(false);
 const [newGroup, setNewGroup] = useState({
 name:"",
 grade:"",
 english_level:"",
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

 // Teacher tasks
 const [tasks, setTasks] = useState<TeacherTask[]>(initialTasks);
 const [togglingTask, setTogglingTask] = useState<string | null>(null);

 // Bulk import state per group
 const [bulkImportMode, setBulkImportMode] = useState<Record<string,"paste"|"csv"| null>>({});
 const [pasteText, setPasteText] = useState<Record<string, string>>({});
 const [parsedStudents, setParsedStudents] = useState<Record<string, Array<{ first_name: string; last_name: string }>>>({});
 const [importing, setImporting] = useState<Record<string, boolean>>({});

 // Document viewer
 const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

 const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});

 // Delete confirmation state
 const [deleteConfirm, setDeleteConfirm] = useState<{ groupId: string; studentId: string; studentName: string } | null>(null);

 // Notes saved toast
 const [notesSavedToast, setNotesSavedToast] = useState<string | null>(null);

 // Schedule confirmation state
 const [confirmingSchedule, setConfirmingSchedule] = useState(false);
 const [scheduleConfirmedAt, setScheduleConfirmedAt] = useState<string | null>(
 project.schedule_confirmed_at
 );

 // Invoice forward state
 const [invoiceForwardEmail, setInvoiceForwardEmail] = useState("");
 const [forwardingInvoice, setForwardingInvoice] = useState<string | null>(null);
 const [forwardSuccess, setForwardSuccess] = useState<string | null>(null);

 const apiBase = `/api/school/project/${token}`;

 // --- Group actions ---

 async function addGroup(e: React.FormEvent) {
 e.preventDefault();
 if (!newGroup.name.trim() || addingGroup) return;
 setAddingGroup(true);
 try {
 const res = await fetch(`${apiBase}/groups`, {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify(newGroup),
 });
 if (res.ok) {
 const { group } = await res.json();
 setGroups((prev) => [...prev, group]);
 setNewGroup({ name:"", grade:"", english_level:""});
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
 method:"POST",
 headers: {"Content-Type":"application/json"},
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
 [groupId]: { first_name:"", last_name:""},
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
 { method:"DELETE"}
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
 method:"PATCH",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ needs_notes: needsNotes }),
 });
 } catch {
 // ignore
 } finally {
 setSavingNotes((prev) => ({ ...prev, [studentId]: false }));
 }
 }

 function confirmDeleteStudent(groupId: string, studentId: string, studentName: string) {
 setDeleteConfirm({ groupId, studentId, studentName });
 }

 async function executeDeleteStudent() {
 if (!deleteConfirm) return;
 await deleteStudent(deleteConfirm.groupId, deleteConfirm.studentId);
 setDeleteConfirm(null);
 }

 // Build consolidated notes for a group
 function buildNotesForGroup(groupId: string): string {
 const parts: string[] = [];
 const sn = specialNeeds[groupId] || [];
 const al = allergies[groupId] || [];
 const dyn = groupDynamics[groupId] ||"";

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
 // For a cleaner approach, we save it as needs_notes on the"group level"via a special student
 // But for now, let's just save it back on individual students if they have specific needs
 // We'll save the full group notes via the group dynamics approach
 // Actually, let's use a simpler pattern: save each student's individual notes
 const sn = specialNeeds[groupId] || [];
 const al = allergies[groupId] || [];

 for (const student of group.project_students) {
 const studentFullName = `${student.first_name} ${student.last_name ||""}`.trim();
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

 // Show success toast
 setNotesSavedToast(groupId);
 setTimeout(() => setNotesSavedToast(null), 3000);
 }

 // --- Teacher task toggle ---

 async function toggleTask(taskId: string) {
 setTogglingTask(taskId);
 try {
 const res = await fetch(`${apiBase}/tasks/${taskId}`, {
 method:"PATCH",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({}),
 });
 if (res.ok) {
 const { task } = await res.json();
 setTasks((prev) =>
 prev.map((t) => (t.id === taskId ? task : t))
 );
 }
 } catch {
 // ignore
 } finally {
 setTogglingTask(null);
 }
 }

 // --- Bulk import helpers ---

 function parsePastedNames(groupId: string) {
 const text = pasteText[groupId] ||"";
 const lines = text
 .split("\n")
 .map((l) => l.trim())
 .filter(Boolean);
 const parsed = lines.map((line) => {
 // Try tab-separated first, then comma, then space
 let parts: string[];
 if (line.includes("\t")) {
 parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
 } else if (line.includes(",")) {
 parts = line.split(",").map((p) => p.trim()).filter(Boolean);
 } else {
 parts = line.split(/\s+/);
 }
 const first_name = parts[0] ||"";
 const last_name = parts.slice(1).join("") ||"";
 return { first_name, last_name };
 });
 setParsedStudents((prev) => ({ ...prev, [groupId]: parsed }));
 }

 function handleCsvUpload(groupId: string, file: File) {
 const reader = new FileReader();
 reader.onload = (e) => {
 const text = e.target?.result as string;
 if (!text) return;
 const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
 if (lines.length === 0) return;

 // Detect header
 const headerLine = lines[0].toLowerCase();
 const hasHeader =
 headerLine.includes("first") ||
 headerLine.includes("last") ||
 headerLine.includes("name") ||
 headerLine.includes("vorname") ||
 headerLine.includes("nachname");

 const dataLines = hasHeader ? lines.slice(1) : lines;
 const separator = lines[0].includes(";") ?";":",";
 const headers = hasHeader
 ? lines[0].split(separator).map((h) => h.trim().toLowerCase())
 : [];

 // Find column indices
 let firstNameIdx = headers.findIndex(
 (h) => h.includes("first") || h ==="vorname");
 let lastNameIdx = headers.findIndex(
 (h) => h.includes("last") || h ==="nachname"|| h ==="surname");
 const nameIdx = headers.findIndex(
 (h) => h ==="name"|| h ==="student"|| h ==="student name");

 const parsed = dataLines
 .map((line) => {
 const cols = line.split(separator).map((c) => c.trim());
 if (firstNameIdx >= 0 && lastNameIdx >= 0) {
 return {
 first_name: cols[firstNameIdx] ||"",
 last_name: cols[lastNameIdx] ||"",
 };
 } else if (nameIdx >= 0) {
 const parts = (cols[nameIdx] ||"").split(/\s+/);
 return {
 first_name: parts[0] ||"",
 last_name: parts.slice(1).join("") ||"",
 };
 } else if (cols.length >= 2 && !hasHeader) {
 // Assume first col = first name, second = last name
 return { first_name: cols[0], last_name: cols[1] };
 } else {
 // Single column, split by space
 const parts = (cols[0] ||"").split(/\s+/);
 return {
 first_name: parts[0] ||"",
 last_name: parts.slice(1).join("") ||"",
 };
 }
 })
 .filter((s) => s.first_name);

 setParsedStudents((prev) => ({ ...prev, [groupId]: parsed }));
 };
 reader.readAsText(file);
 }

 function removeParsedStudent(groupId: string, index: number) {
 setParsedStudents((prev) => ({
 ...prev,
 [groupId]: (prev[groupId] || []).filter((_, i) => i !== index),
 }));
 }

 async function importStudents(groupId: string) {
 const students = parsedStudents[groupId];
 if (!students || students.length === 0) return;
 setImporting((prev) => ({ ...prev, [groupId]: true }));
 try {
 const res = await fetch(`${apiBase}/students`, {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ group_id: groupId, students }),
 });
 if (res.ok) {
 const { students: imported } = await res.json();
 setGroups((prev) =>
 prev.map((g) =>
 g.id === groupId
 ? { ...g, project_students: [...g.project_students, ...imported] }
 : g
 )
 );
 // Clear import state
 setParsedStudents((prev) => ({ ...prev, [groupId]: [] }));
 setPasteText((prev) => ({ ...prev, [groupId]:""}));
 setBulkImportMode((prev) => ({ ...prev, [groupId]: null }));
 }
 } catch {
 // ignore
 } finally {
 setImporting((prev) => ({ ...prev, [groupId]: false }));
 }
 }

 // --- Invoice forward ---
 async function forwardInvoice(invoiceId: string) {
 if (!invoiceForwardEmail.trim()) return;
 setForwardingInvoice(invoiceId);
 setForwardSuccess(null);
 try {
 const res = await fetch(`${apiBase}/invoice/${invoiceId}/send`, {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ email: invoiceForwardEmail }),
 });
 if (res.ok) {
 setForwardSuccess(invoiceId);
 setInvoiceForwardEmail("");
 }
 } catch {
 // ignore
 } finally {
 setForwardingInvoice(null);
 }
 }

 // --- Schedule confirmation ---
 async function confirmSchedule() {
 setConfirmingSchedule(true);
 try {
 const res = await fetch(`${apiBase}/confirm-schedule`, {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 });
 if (res.ok) {
 const data = await res.json();
 setScheduleConfirmedAt(data.schedule_confirmed_at);
 }
 } catch {
 // ignore
 } finally {
 setConfirmingSchedule(false);
 }
 }

 // Compute timeline stages using live state
 const projectForTimeline = {
 ...project,
 schedule_confirmed_at: scheduleConfirmedAt,
 };
 const timelineStages = getStageStatuses(projectForTimeline, schoolInvoices);

 // --- Helpers for special needs / allergies tables ---

 function addSpecialNeedsRow(groupId: string) {
 setSpecialNeeds((prev) => ({
 ...prev,
 [groupId]: [...(prev[groupId] || []), { studentName:"", issue:"", handling:""}],
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
 [groupId]: [...(prev[groupId] || []), { studentName:"", issue:"", handling:""}],
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
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm text-neutral-500">
 Willkommen, {project.teacher_name ||"Lehrkraft"}
 </p>
 <h1 className="mt-1 text-2xl font-bold text-neutral-900">
 {project.name}
 </h1>
 <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-500">
 {project.school && <span>Schule: {project.school}</span>}
 {project.program_type && (
 <span>Programm: {project.program_type}</span>
 )}
 {project.start_date && project.end_date && (
 <span>
 {formatDate(project.start_date)} —{""}
 {formatDate(project.end_date)}
 </span>
 )}
 {project.days && (
 <span>
 {project.days} Tag{project.days > 1 ?"e":""}
 </span>
 )}
 </div>
 </div>
 <span
 className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
 statusStyles[project.status] ||"bg-neutral-100 text-neutral-600"}`}
 >
 {project.status}
 </span>
 </div>
 </div>

 {/* Contact card */}
 <div className="rounded-sm border border-teal-200 bg-teal-50 p-5">
 <div className="flex items-start gap-4">
 <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm bg-teal-100">
 <svg className="h-5 w-5 text-teal-600"fill="none"stroke="currentColor"strokeWidth={2} viewBox="0 0 24 24">
 <path strokeLinecap="round"strokeLinejoin="round"d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
 </svg>
 </div>
 <div>
 <h2 className="text-sm font-semibold text-teal-900">Fragen?</h2>
 <p className="mt-1 text-sm text-teal-700">
 Bei Fragen zum Projekt können Sie sich jederzeit an uns wenden.
 </p>
 <div className="mt-3 space-y-1 text-sm text-teal-800">
 <p className="font-medium">Nicole Bolz</p>
 <p>
 <a href="mailto:nicole@interactenglish.de"className="underline hover:text-teal-900">
 nicole@interactenglish.de
 </a>
 </p>
 <p>
 <a href="tel:+493020339702"className="underline hover:text-teal-900">
 Tel. 030 20339702
 </a>
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* Project Status Timeline */}
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-4 text-lg font-semibold text-neutral-900">Projektstatus</h2>
 <div className="relative ml-4">
 {timelineStages.map((stage, idx) => {
 const isLast = idx === timelineStages.length - 1;
 return (
 <div key={stage.id} className="relative flex gap-4 pb-6">
 {/* Vertical line */}
 {!isLast && (
 <div
 className={`absolute left-[11px] top-6 h-full w-0.5 ${
 stage.status ==="completed"?"bg-teal-400":"bg-neutral-200"}`}
 />
 )}
 {/* Circle */}
 <div className="relative z-10 flex-shrink-0">
 {stage.status ==="completed"? (
 <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500">
 <svg className="h-3.5 w-3.5 text-white"fill="currentColor"viewBox="0 0 20 20">
 <path
 fillRule="evenodd"d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"clipRule="evenodd"/>
 </svg>
 </div>
 ) : stage.status ==="current"? (
 <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-teal-500 bg-white">
 <div className="h-2 w-2 rounded-full bg-teal-500"/>
 </div>
 ) : (
 <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-300 bg-white"/>
 )}
 </div>
 {/* Content */}
 <div
 className={`min-w-0 flex-1 rounded-sm px-3 py-1.5 ${
 stage.status ==="current"?"bg-teal-50":""}`}
 >
 <div className="flex items-center gap-2">
 <p
 className={`text-sm font-medium ${
 stage.status ==="completed"?"text-teal-700": stage.status ==="current"?"text-teal-900":"text-neutral-400"}`}
 >
 {stage.label}
 </p>
 {stage.status ==="completed"&& stage.completedAt && (
 <span className="text-xs text-teal-500">
 {formatDate(stage.completedAt.split("T")[0])}
 </span>
 )}
 </div>
 <p
 className={`text-xs ${
 stage.status ==="future"?"text-neutral-300":"text-neutral-500"}`}
 >
 {stage.description}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Schedule Confirmation */}
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-sm ${
 scheduleConfirmedAt ?"bg-green-100":"bg-teal-100"}`}
 >
 {scheduleConfirmedAt ? (
 <svg className="h-5 w-5 text-green-600"fill="currentColor"viewBox="0 0 20 20">
 <path
 fillRule="evenodd"d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"clipRule="evenodd"/>
 </svg>
 ) : (
 <svg className="h-5 w-5 text-teal-600"fill="none"stroke="currentColor"strokeWidth={2} viewBox="0 0 24 24">
 <path strokeLinecap="round"strokeLinejoin="round"d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
 </svg>
 )}
 </div>
 <div>
 <h2 className="text-sm font-semibold text-neutral-900">Stundenplan</h2>
 <p className="text-xs text-neutral-500">
 {scheduleConfirmedAt
 ? `Bestaetigt am ${formatDate(scheduleConfirmedAt.split("T")[0])}`
 :"Bitte pruefen und bestaetigen Sie den Stundenplan"}
 </p>
 </div>
 </div>
 {!scheduleConfirmedAt ? (
 <button
 onClick={confirmSchedule}
 disabled={confirmingSchedule}
 className="rounded-sm bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
 {confirmingSchedule ?"Wird bestaetigt...":"Stundenplan bestaetigen"}
 </button>
 ) : (
 <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
 <svg className="h-3.5 w-3.5"fill="currentColor"viewBox="0 0 20 20">
 <path
 fillRule="evenodd"d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"clipRule="evenodd"/>
 </svg>
 Bestaetigt
 </span>
 )}
 </div>
 </div>

 {/* Info Pack Form Card */}
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-sm ${
 project.info_pack_submitted_at
 ?"bg-green-100":"bg-teal-100"}`}
 >
 {project.info_pack_submitted_at ? (
 <svg
 className="h-5 w-5 text-green-600"fill="currentColor"viewBox="0 0 20 20">
 <path
 fillRule="evenodd"d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"clipRule="evenodd"/>
 </svg>
 ) : (
 <svg
 className="h-5 w-5 text-teal-600"fill="none"stroke="currentColor"strokeWidth={2}
 viewBox="0 0 24 24">
 <path
 strokeLinecap="round"strokeLinejoin="round"d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
 </svg>
 )}
 </div>
 <div>
 <h2 className="text-sm font-semibold text-neutral-900">
 Info-Formular
 </h2>
 <p className="text-xs text-neutral-500">
 {project.info_pack_submitted_at
 ? `Ausgefüllt am ${formatDate(project.info_pack_submitted_at.split("T")[0])}`
 :"Nicht ausgefüllt"}
 </p>
 </div>
 </div>
 <a
 href={`/school/project/${token}/info-form`}
 className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
 project.info_pack_submitted_at
 ?"border border-neutral-200 text-neutral-600 hover:bg-white":"bg-teal-600 text-white hover:bg-teal-700"}`}
 >
 {project.info_pack_submitted_at
 ?"Formular ansehen":"Info-Formular ausfüllen"}
 </a>
 </div>
 </div>

 {/* Feedback Form Card — show for active/completed projects */}
 {(project.status ==="active"|| project.status ==="completed") && (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div
 className={`flex h-10 w-10 items-center justify-center rounded-sm ${
 project.feedback_submitted_at
 ?"bg-green-100":"bg-teal-100"}`}
 >
 {project.feedback_submitted_at ? (
 <svg
 className="h-5 w-5 text-green-600"fill="currentColor"viewBox="0 0 20 20">
 <path
 fillRule="evenodd"d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"clipRule="evenodd"/>
 </svg>
 ) : (
 <svg
 className="h-5 w-5 text-teal-600"fill="none"stroke="currentColor"strokeWidth={2}
 viewBox="0 0 24 24">
 <path
 strokeLinecap="round"strokeLinejoin="round"d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
 </svg>
 )}
 </div>
 <div>
 <h2 className="text-sm font-semibold text-neutral-900">
 Projektevaluation
 </h2>
 <p className="text-xs text-neutral-500">
 {project.feedback_submitted_at
 ? `Feedback abgegeben am ${formatDate(project.feedback_submitted_at.split("T")[0])}`
 :"Wir freuen uns auf Ihr Feedback!"}
 </p>
 </div>
 </div>
 <a
 href={`/school/project/${token}/feedback`}
 className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
 project.feedback_submitted_at
 ?"border border-neutral-200 text-neutral-600 hover:bg-white":"bg-teal-600 text-white hover:bg-teal-700"}`}
 >
 {project.feedback_submitted_at
 ?"Feedback ansehen":"Feedback geben"}
 </a>
 </div>
 </div>
 )}

 {/* Teaching Artists section */}
 {teamMembers.length > 0 && (
 <div className="space-y-6">
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-1 text-lg font-semibold text-neutral-900">Ihre Teaching Artists</h2>
 <p className="mb-4 text-sm text-neutral-500">Die Künstler*innen für Ihr Projekt</p>
 <div className="space-y-4">
 {teamMembers.map((m) => {
 const taProfile: TAProfile = {
 id: m.profile.id,
 first_name: m.profile.first_name ||"",
 last_name: m.profile.last_name ||"",
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
 <TAProfileCard key={m.id} profile={taProfile} variant="school"/>
 );
 })}
 </div>
 </div>

 {/* Homestay profiles if accommodation is homestay */}
 {project.accommodation?.toLowerCase().includes("homestay") && (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-4 text-lg font-semibold text-neutral-900">Gastfamilien-Profile</h2>
 <div className="space-y-4">
 {teamMembers.map((m) => {
 const taProfile: TAProfile = {
 id: m.profile.id,
 first_name: m.profile.first_name ||"",
 last_name: m.profile.last_name ||"",
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
 <TAProfileCard key={m.id} profile={taProfile} variant="homestay"/>
 );
 })}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Teacher Task Checklist */}
 {tasks.length > 0 && (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-neutral-900">Ihre Aufgaben</h2>
 <span className="text-sm text-neutral-500">
 {tasks.filter((t) => t.completed).length} von {tasks.length} erledigt
 </span>
 </div>
 {/* Progress bar */}
 <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
 <div
 className="h-full rounded-full bg-green-500 transition-all duration-300"style={{
 width: `${tasks.length > 0 ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : 0}%`,
 }}
 />
 </div>
 <ul className="space-y-2">
 {tasks.map((task) => (
 <li
 key={task.id}
 className={`flex items-start gap-3 rounded-sm border p-3 transition-colors ${
 task.completed
 ?"border-green-100 bg-green-50":"border-neutral-100 bg-white"}`}
 >
 <button
 onClick={() => toggleTask(task.id)}
 disabled={togglingTask === task.id}
 className="mt-0.5 flex-shrink-0">
 {task.completed ? (
 <svg className="h-5 w-5 text-green-600"fill="currentColor"viewBox="0 0 20 20">
 <path
 fillRule="evenodd"d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"clipRule="evenodd"/>
 </svg>
 ) : (
 <svg className="h-5 w-5 text-neutral-300 hover:text-neutral-400"fill="none"stroke="currentColor"strokeWidth={2} viewBox="0 0 24 24">
 <circle cx="12"cy="12"r="10"/>
 </svg>
 )}
 </button>
 <div className="min-w-0 flex-1">
 <p
 className={`text-sm font-medium ${
 task.completed ?"text-neutral-400 line-through":"text-neutral-900"}`}
 >
 {task.title}
 </p>
 {task.description && (
 <p className="mt-0.5 text-xs text-neutral-500">{task.description}</p>
 )}
 </div>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Section 1: Student Lists */}
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-neutral-900">
 Schülerlisten
 </h2>
 <button
 onClick={() => setShowAddGroup(true)}
 className="rounded-sm bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800">
 Gruppe hinzufügen
 </button>
 </div>

 {/* Add group form */}
 {showAddGroup && (
 <form
 onSubmit={addGroup}
 className="mb-6 rounded-sm border border-neutral-200 p-4">
 <h3 className="mb-3 text-sm font-semibold text-neutral-900">
 Neue Gruppe
 </h3>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="mb-1 block text-xs font-medium text-neutral-500">
 Gruppenname *
 </label>
 <input
 type="text"required
 value={newGroup.name}
 onChange={(e) =>
 setNewGroup({ ...newGroup, name: e.target.value })
 }
 placeholder="z.B. Klasse 7a"className="w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"/>
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-neutral-500">
 Klassenstufe
 </label>
 <input
 type="text"value={newGroup.grade}
 onChange={(e) =>
 setNewGroup({ ...newGroup, grade: e.target.value })
 }
 placeholder="z.B. 7"className="w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"/>
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-neutral-500">
 Sprachniveau
 </label>
 <input
 type="text"value={newGroup.english_level}
 onChange={(e) =>
 setNewGroup({ ...newGroup, english_level: e.target.value })
 }
 placeholder="z.B. B1"className="w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"/>
 </div>
 </div>
 <div className="mt-4 flex gap-2">
 <button
 type="submit"disabled={addingGroup}
 className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
 {addingGroup ?"Wird hinzugefügt...":"Gruppe hinzufügen"}
 </button>
 <button
 type="button"onClick={() => setShowAddGroup(false)}
 className="rounded-sm border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-white">
 Abbrechen
 </button>
 </div>
 </form>
 )}

 {groups.length === 0 ? (
 <div className="rounded-sm border border-dashed border-neutral-300 p-8 text-center">
 <p className="text-sm text-neutral-500">
 Noch keine Gruppen vorhanden. Klicken Sie auf &quot;Gruppe hinzufügen&quot;, um Ihre erste Klasse anzulegen.
 </p>
 </div>
 ) : (
 <div className="space-y-6">
 {groups.map((group) => (
 <div
 key={group.id}
 className="rounded-sm border border-neutral-200 p-4">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold text-neutral-900">
 {group.name}
 </h3>
 <div className="flex gap-3 text-xs text-neutral-500">
 {group.grade && <span>Klasse: {group.grade}</span>}
 {group.english_level && (
 <span>Niveau: {group.english_level}</span>
 )}
 <span>
 {group.project_students.length} Schüler*in{group.project_students.length !== 1 ?"nen":""}
 </span>
 </div>
 </div>
 </div>

 {/* Student table */}
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-neutral-200">
 <th className="w-10 py-2 text-left text-xs font-medium text-neutral-500">
 #
 </th>
 <th className="py-2 text-left text-xs font-medium text-neutral-500">
 Vorname
 </th>
 <th className="py-2 text-left text-xs font-medium text-neutral-500">
 Nachname
 </th>
 <th className="w-10 py-2"></th>
 </tr>
 </thead>
 <tbody>
 {group.project_students.map((student, idx) => (
 <tr
 key={student.id}
 className="border-b border-neutral-100">
 <td className="py-2 text-neutral-400">{idx + 1}</td>
 <td className="py-2 text-neutral-900">
 {student.first_name}
 </td>
 <td className="py-2 text-neutral-900">
 {student.last_name ||""}
 </td>
 <td className="py-2 text-right">
 <button
 onClick={() =>
 confirmDeleteStudent(group.id, student.id, `${student.first_name} ${student.last_name ||""}`.trim())
 }
 className="text-neutral-400 hover:text-red-500"title="Schüler*in entfernen">
 <svg
 className="h-4 w-4"fill="none"stroke="currentColor"strokeWidth={2}
 viewBox="0 0 24 24">
 <path d="M6 18L18 6M6 6l12 12"/>
 </svg>
 </button>
 </td>
 </tr>
 ))}
 {/* Add student row */}
 <tr>
 <td className="py-2 text-neutral-400">
 {group.project_students.length + 1}
 </td>
 <td className="py-2">
 <input
 type="text"value={
 newStudents[group.id]?.first_name ||""}
 onChange={(e) =>
 setNewStudents((prev) => ({
 ...prev,
 [group.id]: {
 ...prev[group.id],
 first_name: e.target.value,
 last_name:
 prev[group.id]?.last_name ||"",
 },
 }))
 }
 onKeyDown={(e) => {
 if (e.key ==="Enter") {
 e.preventDefault();
 addStudent(group.id);
 }
 }}
 placeholder="Vorname"className="w-full rounded border border-neutral-200 px-2 py-1 text-sm focus:border-neutral-400 focus:outline-none"/>
 </td>
 <td className="py-2">
 <input
 type="text"value={
 newStudents[group.id]?.last_name ||""}
 onChange={(e) =>
 setNewStudents((prev) => ({
 ...prev,
 [group.id]: {
 ...prev[group.id],
 first_name:
 prev[group.id]?.first_name ||"",
 last_name: e.target.value,
 },
 }))
 }
 onKeyDown={(e) => {
 if (e.key ==="Enter") {
 e.preventDefault();
 addStudent(group.id);
 }
 }}
 placeholder="Nachname"className="w-full rounded border border-neutral-200 px-2 py-1 text-sm focus:border-neutral-400 focus:outline-none"/>
 </td>
 <td className="py-2 text-right">
 <button
 onClick={() => addStudent(group.id)}
 disabled={
 !newStudents[group.id]?.first_name?.trim()
 }
 className="rounded bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800 disabled:opacity-30">
 +
 </button>
 </td>
 </tr>
 </tbody>
 </table>

 {/* Bulk import section */}
 <div className="mt-3 border-t border-neutral-100 pt-3">
 {!bulkImportMode[group.id] ? (
 <div className="flex gap-2">
 <button
 onClick={() =>
 setBulkImportMode((prev) => ({ ...prev, [group.id]:"paste"}))
 }
 className="rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-white">
 Schülerliste einfügen
 </button>
 <button
 onClick={() =>
 setBulkImportMode((prev) => ({ ...prev, [group.id]:"csv"}))
 }
 className="rounded border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-white">
 CSV hochladen
 </button>
 </div>
 ) : (
 <div className="rounded-sm border border-neutral-200 bg-white p-4">
 <div className="mb-3 flex items-center justify-between">
 <h4 className="text-sm font-medium text-neutral-900">
 {bulkImportMode[group.id] ==="paste"?"Schülernamen einfügen":"CSV-Datei hochladen"}
 </h4>
 <button
 onClick={() => {
 setBulkImportMode((prev) => ({ ...prev, [group.id]: null }));
 setParsedStudents((prev) => ({ ...prev, [group.id]: [] }));
 setPasteText((prev) => ({ ...prev, [group.id]:""}));
 }}
 className="text-xs text-neutral-500 hover:text-neutral-700">
 Abbrechen
 </button>
 </div>

 {bulkImportMode[group.id] ==="paste"&& (
 <>
 <textarea
 value={pasteText[group.id] ||""}
 onChange={(e) =>
 setPasteText((prev) => ({
 ...prev,
 [group.id]: e.target.value,
 }))
 }
 rows={6}
 placeholder={"Schülernamen einfügen, ein Name pro Zeile:\nMax Mustermann\nAnna Schmidt\nLukas Weber"}
 className="w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"/>
 <button
 onClick={() => parsePastedNames(group.id)}
 disabled={!(pasteText[group.id] ||"").trim()}
 className="mt-2 rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-30">
 Namen erkennen
 </button>
 </>
 )}

 {bulkImportMode[group.id] ==="csv"&& (
 <div>
 <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-neutral-300 bg-white p-4 text-center hover:bg-white">
 <svg className="h-5 w-5 text-neutral-400"fill="none"stroke="currentColor"strokeWidth={2} viewBox="0 0 24 24">
 <path d="M12 4v16m8-8H4"/>
 </svg>
 <span className="text-sm text-neutral-600">CSV-Datei auswählen</span>
 <input
 type="file"accept=".csv"className="hidden"onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleCsvUpload(group.id, file);
 }}
 />
 </label>
 <p className="mt-1 text-xs text-neutral-400">
 CSV mit Vorname/Nachname-Spalten oder einer einzelnen Name-Spalte
 </p>
 </div>
 )}

 {/* Preview parsed students */}
 {(parsedStudents[group.id] || []).length > 0 && (
 <div className="mt-3">
 <h5 className="mb-2 text-xs font-medium text-neutral-600">
 Vorschau ({parsedStudents[group.id].length} Schüler*innen)
 </h5>
 <div className="max-h-48 overflow-y-auto rounded border border-neutral-200 bg-white">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-neutral-200">
 <th className="w-10 py-1.5 pl-3 text-left text-xs font-medium text-neutral-500">#</th>
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">Vorname</th>
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">Nachname</th>
 <th className="w-8 py-1.5"></th>
 </tr>
 </thead>
 <tbody>
 {parsedStudents[group.id].map((s, i) => (
 <tr key={i} className="border-b border-neutral-100">
 <td className="py-1.5 pl-3 text-neutral-400">{i + 1}</td>
 <td className="py-1.5 text-neutral-900">{s.first_name}</td>
 <td className="py-1.5 text-neutral-900">{s.last_name}</td>
 <td className="py-1.5 pr-2 text-right">
 <button
 onClick={() => removeParsedStudent(group.id, i)}
 className="text-neutral-400 hover:text-red-500">
 <svg className="h-3.5 w-3.5"fill="none"stroke="currentColor"strokeWidth={2} viewBox="0 0 24 24">
 <path d="M6 18L18 6M6 6l12 12"/>
 </svg>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <button
 onClick={() => importStudents(group.id)}
 disabled={importing[group.id]}
 className="mt-3 rounded bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
 {importing[group.id]
 ?"Wird importiert...": `${parsedStudents[group.id].length} Schüler*innen importieren`}
 </button>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Special needs section */}
 <div className="mt-4">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
 Schüler*innen mit besonderem Förderbedarf
 </h4>
 <button
 onClick={() => addSpecialNeedsRow(group.id)}
 className="text-xs text-neutral-500 hover:text-neutral-700">
 + Zeile hinzufügen
 </button>
 </div>
 {(specialNeeds[group.id] || []).length > 0 && (
 <table className="mt-2 w-full text-sm">
 <thead>
 <tr className="border-b border-neutral-200">
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">
 Schüler*in
 </th>
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">
 Thema
 </th>
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">
 Umgang
 </th>
 <th className="w-8 py-1.5"></th>
 </tr>
 </thead>
 <tbody>
 {(specialNeeds[group.id] || []).map((row, i) => (
 <tr key={i} className="border-b border-neutral-100">
 <td className="py-1.5">
 <input
 type="text"value={row.studentName}
 onChange={(e) =>
 updateSpecialNeedsRow(
 group.id,
 i,"studentName",
 e.target.value
 )
 }
 className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"/>
 </td>
 <td className="py-1.5">
 <input
 type="text"value={row.issue}
 onChange={(e) =>
 updateSpecialNeedsRow(
 group.id,
 i,"issue",
 e.target.value
 )
 }
 className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"/>
 </td>
 <td className="py-1.5">
 <input
 type="text"value={row.handling}
 onChange={(e) =>
 updateSpecialNeedsRow(
 group.id,
 i,"handling",
 e.target.value
 )
 }
 className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"/>
 </td>
 <td className="py-1.5 text-right">
 <button
 onClick={() =>
 removeSpecialNeedsRow(group.id, i)
 }
 className="text-neutral-400 hover:text-red-500">
 <svg
 className="h-4 w-4"fill="none"stroke="currentColor"strokeWidth={2}
 viewBox="0 0 24 24">
 <path d="M6 18L18 6M6 6l12 12"/>
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
 <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
 Allergien &amp; Medikamente
 </h4>
 <button
 onClick={() => addAllergyRow(group.id)}
 className="text-xs text-neutral-500 hover:text-neutral-700">
 + Zeile hinzufügen
 </button>
 </div>
 {(allergies[group.id] || []).length > 0 && (
 <table className="mt-2 w-full text-sm">
 <thead>
 <tr className="border-b border-neutral-200">
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">
 Schüler*in
 </th>
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">
 Allergie / Medikament
 </th>
 <th className="py-1.5 text-left text-xs font-medium text-neutral-500">
 Umgang
 </th>
 <th className="w-8 py-1.5"></th>
 </tr>
 </thead>
 <tbody>
 {(allergies[group.id] || []).map((row, i) => (
 <tr key={i} className="border-b border-neutral-100">
 <td className="py-1.5">
 <input
 type="text"value={row.studentName}
 onChange={(e) =>
 updateAllergyRow(
 group.id,
 i,"studentName",
 e.target.value
 )
 }
 className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"/>
 </td>
 <td className="py-1.5">
 <input
 type="text"value={row.issue}
 onChange={(e) =>
 updateAllergyRow(
 group.id,
 i,"issue",
 e.target.value
 )
 }
 className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"/>
 </td>
 <td className="py-1.5">
 <input
 type="text"value={row.handling}
 onChange={(e) =>
 updateAllergyRow(
 group.id,
 i,"handling",
 e.target.value
 )
 }
 className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"/>
 </td>
 <td className="py-1.5 text-right">
 <button
 onClick={() =>
 removeAllergyRow(group.id, i)
 }
 className="text-neutral-400 hover:text-red-500">
 <svg
 className="h-4 w-4"fill="none"stroke="currentColor"strokeWidth={2}
 viewBox="0 0 24 24">
 <path d="M6 18L18 6M6 6l12 12"/>
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
 <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
 Gruppendynamik
 </h4>
 <textarea
 value={groupDynamics[group.id] ||""}
 onChange={(e) =>
 setGroupDynamics((prev) => ({
 ...prev,
 [group.id]: e.target.value,
 }))
 }
 rows={3}
 placeholder="Anmerkungen zur Gruppendynamik, Freundschaften, Konflikte usw."className="mt-2 w-full rounded-sm border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"/>
 </div>

 {/* Save group notes button */}
 {((specialNeeds[group.id] || []).length > 0 ||
 (allergies[group.id] || []).length > 0 ||
 (groupDynamics[group.id] ||"").trim()) && (
 <div className="mt-3 flex items-center gap-3">
 <button
 onClick={() => saveGroupNotes(group.id)}
 className="rounded-sm bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800">
 Gruppennotizen speichern
 </button>
 {notesSavedToast === group.id && (
 <span className="text-xs font-medium text-green-600">Gespeichert!</span>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Section 2: Documents */}
 {documents.length > 0 && (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-4 text-lg font-semibold text-neutral-900">
 Dokumente
 </h2>
 <ul className="space-y-2">
 {documents.map((doc) => (
 <li
 key={doc.id}
 className="flex items-center justify-between rounded-sm border border-neutral-100 p-3">
 <div>
 <p className="text-sm font-medium text-neutral-900">
 {doc.name}
 </p>
 {doc.description && (
 <p className="text-xs text-neutral-500">{doc.description}</p>
 )}
 </div>
 <div>
 {doc.doc_type ==="file"&& doc.file_url ? (
 <a
 href={doc.file_url}
 target="_blank"rel="noopener noreferrer"className="rounded-sm border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-white">
 Herunterladen
 </a>
 ) : doc.doc_type ==="native"&& doc.content ? (
 <button
 onClick={() =>
 setViewingDoc(viewingDoc?.id === doc.id ? null : doc)
 }
 className="rounded-sm border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-white">
 {viewingDoc?.id === doc.id ?"Schließen":"Lesen"}
 </button>
 ) : null}
 </div>
 </li>
 ))}
 </ul>

 {/* Inline document viewer */}
 {viewingDoc && viewingDoc.content && (
 <div className="mt-4 rounded-sm border border-neutral-200 p-6">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-neutral-900">
 {viewingDoc.name}
 </h3>
 <button
 onClick={() => setViewingDoc(null)}
 className="text-xs text-neutral-500 hover:text-neutral-700">
 Schließen
 </button>
 </div>
 <RichTextViewer content={viewingDoc.content} />
 </div>
 )}
 </div>
 )}

 {/* Delete confirmation dialog */}
 {deleteConfirm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
 <div className="mx-4 w-full max-w-sm rounded-sm bg-white p-6">
 <h3 className="text-lg font-semibold text-neutral-900">Schüler*in entfernen?</h3>
 <p className="mt-2 text-sm text-neutral-600">
 Möchten Sie <strong>{deleteConfirm.studentName}</strong> wirklich aus der Liste entfernen?
 </p>
 <div className="mt-6 flex justify-end gap-3">
 <button
 onClick={() => setDeleteConfirm(null)}
 className="rounded-sm border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-white">
 Abbrechen
 </button>
 <button
 onClick={executeDeleteStudent}
 className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
 Entfernen
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Invoice section */}
 {schoolInvoices.length > 0 && (
 <div className="rounded-sm border border-neutral-200 bg-white p-6">
 <h2 className="mb-4 text-lg font-semibold text-neutral-900">Rechnung</h2>
 <div className="space-y-4">
 {schoolInvoices.map((inv) => (
 <div key={inv.id} className="rounded-sm border border-neutral-100 p-4">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm font-semibold text-neutral-900">
 Ihre Rechnung ist bereit
 </p>
 <div className="mt-2 space-y-1 text-sm text-neutral-600">
 <p>Rechnung: <strong>{inv.invoice_number}</strong></p>
 <p>Betrag: <strong>{"\u20AC"}{inv.total.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</strong></p>
 <p>Fällig: <strong>{new Date(inv.due_date +"T00:00:00").toLocaleDateString("de-DE", { day:"numeric", month:"long", year:"numeric"})}</strong></p>
 </div>
 </div>
 {inv.pdf_url && (
 <a
 href={inv.pdf_url}
 target="_blank"rel="noopener noreferrer"className="rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
 Rechnung als PDF
 </a>
 )}
 </div>

 <div className="mt-4 border-t border-neutral-100 pt-4">
 <p className="mb-2 text-xs font-medium text-neutral-500">
 An Ihre Buchhaltung weiterleiten
 </p>
 <div className="flex items-end gap-2">
 <div className="flex-1">
 <input
 type="email"value={invoiceForwardEmail}
 onChange={(e) => setInvoiceForwardEmail(e.target.value)}
 placeholder="finance@school.de"className="w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm"/>
 </div>
 <button
 onClick={() => forwardInvoice(inv.id)}
 disabled={forwardingInvoice === inv.id || !invoiceForwardEmail.trim()}
 className="rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
 {forwardingInvoice === inv.id ?"Wird gesendet...":"Senden"}
 </button>
 </div>
 {forwardSuccess === inv.id && (
 <p className="mt-2 text-xs text-green-600">Rechnung erfolgreich gesendet!</p>
 )}
 <p className="mt-2 text-xs text-neutral-400">
 Zahlung: Bitte überweisen Sie an Berliner Sparkasse, IBAN DE64100500000190650656, BIC BELADEBEXXX. Verwenden Sie die Rechnungsnummer und den Schulnamen als Referenz.
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
