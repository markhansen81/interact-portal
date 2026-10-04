"use client";

import { useState } from "react";
import Link from "next/link";
import { RichTextViewer } from "@/components/shared/rich-text-viewer";
import { ProjectTeam } from "@/components/portal/project-team";
import { AttendanceRoll } from "@/components/portal/attendance-roll";

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
  visibility?: string | null;
}

interface TeamMember {
  id: string;
  ta_id: string;
  role: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    preferred_name: string | null;
    photo_url: string | null;
    phone: string | null;
    phone_consent: boolean;
  };
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

function getCountdown(startDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00");
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return `Starts in ${diffDays} days`;
  if (diffDays === 1) return "Starts tomorrow";
  if (diffDays === 0) return "Starts today";
  return "In progress";
}

type TabId = "overview" | "tasks" | "documents" | "attendance" | "travel";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "documents", label: "Documents" },
  { id: "attendance", label: "Attendance" },
  { id: "travel", label: "Travel" },
];

export function TAProjectView({
  project,
  tasks: initialTasks,
  documents,
  teamMembers,
}: {
  project: Project;
  tasks: Task[];
  documents: Document[];
  teamMembers: TeamMember[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter documents for TA visibility
  const taDocs = documents.filter(
    (d) => !d.visibility || d.visibility === "ta" || d.visibility === "both"
  );
  const travelDocs = documents.filter(
    (d) => d.name.toLowerCase().includes("travel") || d.name.toLowerCase().includes("flight") || d.name.toLowerCase().includes("itinerary")
  );

  // Determine if attendance tab should show
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const projectStart = project.start_date ? new Date(project.start_date + "T00:00:00") : null;
  const showAttendance = !projectStart || now >= projectStart || project.status === "active";

  async function toggleTask(taskId: string, completed: boolean) {
    setLoading(taskId);
    try {
      const res = await fetch(`/api/portal/projects/${project.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (res.ok) {
        const { task: updated } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: updated.completed, completed_at: updated.completed_at } : t)));
      }
    } catch {
      // ignore
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/portal/projects" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        &larr; Back to Projects
      </Link>

      {/* Project header with countdown */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{project.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              {project.school && <span>School: {project.school}</span>}
              {project.program_type && <span>Program: {project.program_type}</span>}
              {project.start_date && project.end_date && (
                <span>{formatDate(project.start_date)} — {formatDate(project.end_date)}</span>
              )}
              {project.days && <span>{project.days} day{project.days > 1 ? "s" : ""}</span>}
            </div>
            {project.start_date && project.status === "upcoming" && (
              <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                {getCountdown(project.start_date)}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyles[project.status] || ""}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {tab.id === "tasks" && totalCount > 0 && (
              <span className="ml-1.5 text-xs opacity-60">{completedCount}/{totalCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Team */}
          <ProjectTeam members={teamMembers} />

          {/* Quick tasks summary */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tasks Progress</h2>
              <button
                onClick={() => setActiveTab("tasks")}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                View all
              </button>
            </div>
            {totalCount > 0 ? (
              <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {completedCount} of {totalCount} tasks completed ({progress}%)
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No tasks assigned yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tasks</h2>
            <span className="text-sm text-zinc-500">{completedCount}/{totalCount} completed</span>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mb-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-400">{progress}% complete</p>
            </div>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No tasks assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    disabled={loading === task.id}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      task.completed
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600"
                    } ${loading === task.id ? "opacity-50" : ""}`}
                  >
                    {task.completed && (
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
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
                          <svg className="ml-1 inline h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
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
                    {task.description && (
                      <p className="mt-0.5 text-xs text-zinc-500">{task.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "documents" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Documents</h2>
          {taDocs.length === 0 ? (
            <p className="text-sm text-zinc-500">No documents published yet.</p>
          ) : (
            <ul className="space-y-2">
              {taDocs.map((doc) => (
                <li key={doc.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{doc.name}</p>
                      {doc.description && <p className="text-xs text-zinc-500">{doc.description}</p>}
                    </div>
                    {doc.doc_type === "native" ? (
                      <button
                        onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {expandedDoc === doc.id ? "Close" : "Read"}
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
                  {doc.doc_type === "native" && expandedDoc === doc.id && doc.content && (
                    <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                      <RichTextViewer content={doc.content} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Attendance</h2>
          {showAttendance && project.start_date && project.end_date ? (
            <AttendanceRoll
              projectId={project.id}
              startDate={project.start_date}
              endDate={project.end_date}
              days={project.days}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              Attendance tracking will be available once the project begins.
            </p>
          )}
        </div>
      )}

      {activeTab === "travel" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Travel</h2>

          <a
            href="https://www.lanesandplanes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Open Lanes & Planes
          </a>

          {travelDocs.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Travel Documents</h3>
              <ul className="space-y-2">
                {travelDocs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{doc.name}</p>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {travelDocs.length === 0 && (
            <p className="mt-4 text-sm text-zinc-500">No travel documents uploaded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
