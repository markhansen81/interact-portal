"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Template {
  id: string;
  type: string;
  version: number;
  title: string;
  body: string;
  created_at: string;
}

const TEMPLATE_TYPES = [
  { value: "framework_contract", label: "Framework Contract (Yearly)" },
  { value: "democratic_values", label: "Democratic Values Declaration" },
  { value: "self_declaration_police", label: "Self-Declaration Police Check" },
  { value: "photo_release", label: "Photo Release Form" },
];

export function ContractTemplateEditor({
  templates,
}: {
  templates: Template[];
}) {
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // Group by type, show latest version
  const byType = new Map<string, Template>();
  templates.forEach((t) => {
    if (!byType.has(t.type) || t.version > (byType.get(t.type)?.version || 0)) {
      byType.set(t.type, t);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New Template
        </button>
      </div>

      {creating && (
        <TemplateForm
          onClose={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <TemplateForm
          template={editing}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {/* Templates List */}
      <div className="space-y-4">
        {TEMPLATE_TYPES.map((tt) => {
          const template = byType.get(tt.value);
          return (
            <div
              key={tt.value}
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {tt.label}
                  </h3>
                  {template ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      v{template.version} — Last updated{" "}
                      {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-400">No template yet</p>
                  )}
                </div>
                {template && (
                  <button
                    onClick={() => setEditing(template)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Edit
                  </button>
                )}
              </div>
              {template && (
                <div className="mt-4 max-h-40 overflow-hidden rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: template.body.substring(0, 500) + "...",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Version History */}
      {templates.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Version History
          </h3>
          <div className="mt-4 space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2 dark:bg-zinc-800/50"
              >
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {t.title}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">v{t.version}</span>
                </div>
                <span className="text-xs text-zinc-400">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateForm({
  template,
  onClose,
}: {
  template?: Template;
  onClose: () => void;
}) {
  const [type, setType] = useState(template?.type || "");
  const [title, setTitle] = useState(template?.title || "");
  const [body, setBody] = useState(template?.body || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    await fetch("/api/admin/contracts/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: type || template?.type,
        title,
        body,
        base_version: template?.version,
      }),
    });

    setLoading(false);
    onClose();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {template ? `Edit: ${template.title}` : "New Template"}
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        {template
          ? "Saving creates a new version. Previous versions are preserved."
          : "Create a new contract template."}
      </p>
      <div className="mt-4 space-y-4">
        {!template && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Type
            </label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="">Select...</option>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Title
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Content (HTML)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="input font-mono text-xs"
            rows={15}
            placeholder="<h1>Contract Title</h1><p>Contract body...</p>"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Saving..." : template ? "Save New Version" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
