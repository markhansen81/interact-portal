"use client";

import { useState } from "react";
import type { TemplateDefault } from "@/lib/email-templates";

interface DbTemplate {
  subject: string;
  html_body: string;
  updated_at: string;
}

interface EmailPreviewCardProps {
  id: string;
  name: string;
  trigger: string;
  recipients: string;
  language: "en" | "de";
  // sample-rendered version (for preview only)
  subject: string;
  html: string;
  // DB version if admin has customized it
  dbTemplate: DbTemplate | null;
  // default template with {{VAR}} placeholders
  templateDefault: TemplateDefault;
}

const recipientColors: Record<string, string> = {
  TA: "bg-blue-50 text-blue-700",
  Admin: "bg-purple-50 text-purple-700",
  School: "bg-green-50 text-green-700",
  Parent: "bg-orange-50 text-orange-700",
  "TA / Admin": "bg-blue-50 text-blue-700",
};

function getRecipientColor(recipients: string): string {
  return recipientColors[recipients] ?? "bg-neutral-100 text-neutral-600";
}

export function EmailPreviewCard({
  id,
  name,
  trigger,
  recipients,
  language,
  subject,
  html,
  dbTemplate,
  templateDefault,
}: EmailPreviewCardProps) {
  const [mode, setMode] = useState<"collapsed" | "preview" | "edit">("collapsed");
  const [editSubject, setEditSubject] = useState(dbTemplate?.subject ?? templateDefault.subject);
  const [editHtml, setEditHtml] = useState(dbTemplate?.html_body ?? templateDefault.html_body);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customized, setCustomized] = useState(!!dbTemplate);
  const [currentDbTemplate, setCurrentDbTemplate] = useState<DbTemplate | null>(dbTemplate);

  const iframeDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff;}</style></head><body>${html}</body></html>`;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, html_body: editHtml }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setCurrentDbTemplate(data.template);
      setCustomized(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setMode("collapsed");
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Reset to default template? Your customizations will be lost.")) return;
    setSaving(true);
    setError(null);
    try {
      await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
      setCurrentDbTemplate(null);
      setCustomized(false);
      setEditSubject(templateDefault.subject);
      setEditHtml(templateDefault.html_body);
      setMode("collapsed");
    } catch {
      setError("Reset failed");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit() {
    // Start edit from DB version if exists, otherwise from templateDefault
    setEditSubject(currentDbTemplate?.subject ?? templateDefault.subject);
    setEditHtml(currentDbTemplate?.html_body ?? templateDefault.html_body);
    setMode("edit");
  }

  return (
    <div id={id} className="overflow-hidden rounded-sm border border-neutral-200 bg-white">
      {/* Header row */}
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-neutral-100 text-neutral-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">{name}</h3>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getRecipientColor(recipients)}`}>
                  {recipients}
                </span>
                {language === "de" && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">DE</span>
                )}
                {language === "en" && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">EN</span>
                )}
                {customized && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Customized
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed">{trigger}</p>
              <p className="mt-2 font-mono text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 truncate">
                {currentDbTemplate?.subject ?? subject}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 rounded-sm border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setMode(mode === "preview" ? "collapsed" : "preview")}
                className="inline-flex items-center gap-1.5 rounded-sm border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {mode === "preview" ? "Hide" : "Preview"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview pane */}
      {mode === "preview" && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-2 text-[11px] text-neutral-400">Sample render (with example data)</p>
          <iframe
            srcDoc={iframeDoc}
            className="border border-neutral-200 rounded-sm w-full"
            style={{ height: 400 }}
            title={`Preview: ${name}`}
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* Edit pane */}
      {mode === "edit" && (
        <div className="border-t border-neutral-200 bg-white p-5 space-y-4">
          {/* Variable reference */}
          <div className="rounded-sm bg-neutral-50 border border-neutral-200 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Available variables</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {templateDefault.variables.map((v) => (
                <span key={v.key} className="text-[12px] text-neutral-600">
                  <code className="font-mono text-[11px] bg-white border border-neutral-200 rounded px-1 py-0.5 text-blue-600">{"{{" + v.key + "}}"}</code>
                  {" "}{v.description}
                </span>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Subject</label>
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none"
            />
          </div>

          {/* HTML body */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">HTML Body</label>
            <textarea
              value={editHtml}
              onChange={(e) => setEditHtml(e.target.value)}
              rows={16}
              className="w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-neutral-900 focus:border-neutral-400 focus:outline-none resize-y"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-sm bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                {saved ? "Saved!" : saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setMode("collapsed")}
                className="inline-flex items-center rounded-sm border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            {customized && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
