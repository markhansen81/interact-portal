"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

interface Template {
  id: string;
  name: string;
  version: number;
  body_html: string;
  conditions_html: string | null;
  active: boolean;
}

const VARIABLE_TAGS = [
  { tag: "{{TeachingArtist}}", label: "TA Name", group: "TA" },
  { tag: "{{TeachingArtistEmail}}", label: "TA Email", group: "TA" },
  { tag: "{{MondayID}}", label: "Monday Task ID", group: "Project" },
  { tag: "{{ProjectID}}", label: "Portal ID", group: "Project" },
  { tag: "{{Date}}", label: "Date Range", group: "Project" },
  { tag: "{{Days}}", label: "# Days", group: "Project" },
  { tag: "{{Name}}", label: "School Name", group: "Project" },
  { tag: "{{Address}}", label: "Address", group: "Project" },
  { tag: "{{State}}", label: "State", group: "Project" },
  { tag: "{{ProjectType}}", label: "Program Type", group: "Project" },
  { tag: "{{SpecialConditions}}", label: "Special Conditions", group: "Project" },
  { tag: "{{CoTaught}}", label: "Co taught", group: "Project" },
  { tag: "{{Grade}}", label: "Grade", group: "Project" },
  { tag: "{{Accommodation}}", label: "Accommodation", group: "Project" },
  { tag: "{{Total}}", label: "Total (€)", group: "Pay" },
  { tag: "{{PayLevel}}", label: "Level", group: "Pay" },
  { tag: "{{SignByDate}}", label: "Sign-by Date", group: "Admin" },
  { tag: "{{CreatedDate}}", label: "Created Date", group: "Admin" },
];

const SAMPLE_DATA: Record<string, string> = {
  TeachingArtist: "Jane Smith", TeachingArtistEmail: "jane@example.com",
  ProjectID: "WO-ABC123", MondayID: "10037723799",
  Date: "18.05.2026 — 22.05.2026", Days: "5 days",
  Name: "Realschule Maria Stern Augsburg", Address: "Schulstraße 12, 86150 Augsburg",
  State: "BAYERN", ProjectType: "Native Speaker Week", SpecialConditions: "None",
  CoTaught: "Not co taught", Grade: "8. Kl.", Accommodation: "Hotel Ibis",
  Total: "€560.00", PayLevel: "Level 5",
  SignByDate: "10.05.2026", CreatedDate: new Date().toLocaleDateString("de-DE"),
};

// Fixed header — not editable in the body, same on every WO
function PageHeader({ preview }: { preview?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "40px 50px 0", fontFamily: "Arial, sans-serif" }}>
      <div>
        <img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="InterACT English" style={{ width: 160 }} />
      </div>
      <div style={{ textAlign: "right", fontSize: 10, color: "#666", lineHeight: 1.5 }}>
        InterACT English gGmbH<br />
        Planufer 92B, 10967 Berlin<br />
        Tel. 030 20339702<br />
        info@interactenglish.de<br />
        <br />
        Geschäftsführer:<br />
        Mark William Hansen &amp; Charles Justin Beard<br />
        Handelsregister - Amtsgericht Charlottenburg<br />
        HRB 188932 B
        {preview && (
          <>
            <br /><br />
            <span style={{ color: "#16a34a", fontWeight: "bold" }}>Project ID: {SAMPLE_DATA.MondayID}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Fixed footer — same on every WO
function PageFooter() {
  return (
    <div style={{ borderTop: "1px solid #ddd", padding: "12px 50px", display: "flex", alignItems: "center", gap: 16, fontFamily: "Arial, sans-serif" }}>
      <img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="" style={{ width: 90 }} />
      <div style={{ fontSize: 9, color: "#999", lineHeight: 1.5 }}>
        InterACT English gGmbH, Planufer 92B, 10967 Berlin<br />
        Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de
      </div>
    </div>
  );
}

const DEFAULT_TEMPLATE = `<h1><strong>WORK ORDER</strong></h1>
<p><br></p>
<p>By and between</p>
<p><strong>InterACT English gGmbH</strong></p>
<p><em>(referred to in the following as "the Company")</em></p>
<p><br></p>
<p>and: <strong>{{TeachingArtist}}</strong></p>
<p><em>(referred to in the following as "the Contractor")</em></p>
<p><br></p>
<h2><strong>Project Details</strong></h2>
<p><em>The Contractor shall be teaching on the following project (details subject to change):</em></p>
<p><br></p>
<p><strong>Date of project / Time period:</strong> {{Date}}, {{Days}}</p>
<p><strong>Organisation (workplace):</strong> {{Name}}</p>
<p>{{Address}}</p>
<p>{{State}}</p>
<p><strong>Project type:</strong> {{ProjectType}}</p>
<p><strong>Special conditions:</strong> <em>{{SpecialConditions}}</em></p>
<p><strong>Co taught / Not co taught:</strong> {{CoTaught}}</p>
<p><strong>Grade:</strong> {{Grade}}</p>
<p><strong>Accommodation:</strong> {{Accommodation}}</p>
<p><br></p>
<h3>IMPORTANT: Before signing this work order please do and consider the following:</h3>
<ol>
<li><strong>We require all TAs to travel the day before the project</strong> if outside their home city. Travel the day before is included in the flat-fee. Accommodation for the evening before is always provided. <strong>Please do not sign if travel the day before is an issue.</strong></li>
<li>Check the address of the school/hostel. Some projects require longer travel time.</li>
<li>Check the area/city/village. <strong>Most projects have you arriving in the evening, often on Sunday. Finding food can be difficult in rural locations.</strong></li>
<li>Please CAREFULLY read the project notes the week before traveling.</li>
<li><strong>Double check all connections, transfers and your way from train station to hotel and school.</strong></li>
</ol>
<p><br></p>
<p><strong>If you like to decline but are still available,</strong> send us your reasons. We may have alternative projects.</p>
<p>We thank you for all of your input and wish you successful projects!</p>
<p><br></p>
<p>_______________________________________________</p>
<p>With this signature I accept the Work Order:</p>
<p><br></p>
<p><br></p>
<p><strong>{{TeachingArtist}}</strong></p>
<p><em>Teaching Artist (Contractor)</em></p>
<p><br></p>
<p><strong>Berlin, {{CreatedDate}}</strong></p>
<p><br></p>
<p><strong>C. Justin Beard</strong></p>
<p>Chief Executive Officer</p>
<p>InterACT English gGmbH</p>`;

export function WorkOrderTemplateEditor({ template }: { template: Template | null }) {
  const [html, setHtml] = useState(template?.body_html || DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();

  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link", "image"],
      ["blockquote", "clean"],
    ],
  }), []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/work-orders/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body_html: html, conditions_html: null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function fillVariables(content: string) {
    return content.replace(/\{\{(\w+)\}\}/g, (_m, v) => {
      const val = SAMPLE_DATA[v] || v;
      return `<span style="background:#dbeafe;padding:1px 5px;border-radius:3px;font-weight:600;">${val}</span>`;
    });
  }

  function copyTag(tag: string) {
    navigator.clipboard.writeText(tag);
    setCopied(tag);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Variables</h3>
          <p className="text-[10px] text-zinc-400 mb-3">Click to copy, paste into editor (Ctrl+V)</p>
          {["Project", "TA", "Pay", "Admin"].map((group) => (
            <div key={group} className="mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">{group}</p>
              <div className="space-y-0.5">
                {VARIABLE_TAGS.filter((t) => t.group === group).map((tag) => (
                  <button key={tag.tag} onClick={() => copyTag(tag.tag)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-blue-50 active:bg-blue-100">
                    <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                      {tag.tag.replace(/\{\{|\}\}/g, "")}
                    </span>
                    <span className="text-zinc-500 truncate">{tag.label}</span>
                    {copied === tag.tag && <span className="text-[10px] text-green-600 ml-auto">Copied!</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Page Layout</h3>
          <p className="text-[10px] text-zinc-400">Header and footer are fixed — they appear on every work order automatically. You only edit the body content above.</p>
        </div>

        <Link href="/admin/work-orders" className="block text-center text-sm text-zinc-500 hover:text-zinc-700">&larr; Back</Link>
      </div>

      {/* Editor / Preview */}
      <div className="lg:col-span-4 space-y-3">
        {/* Controls */}
        <div className="flex items-center justify-end gap-2">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button onClick={() => setShowPreview(!showPreview)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${showPreview ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            {showPreview ? "Back to Editor" : "Preview"}
          </button>
          {template && <span className="text-[10px] text-zinc-400">v{template.version}</span>}
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            {saving ? "..." : "Save Template"}
          </button>
        </div>

        {/* A4 Page */}
        <div className="wo-page mx-auto" style={{ width: 794, background: "white", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {/* Header — always visible */}
          <PageHeader preview={showPreview} />

          <hr style={{ margin: "12px 50px", border: "none", borderTop: "2px solid #1a1a1a" }} />

          {/* Body — editor or preview */}
          {showPreview ? (
            <div className="ql-snow">
              <div className="ql-editor" style={{ padding: "0 50px 20px", fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.7, overflowWrap: "break-word", minHeight: 800 }}
                dangerouslySetInnerHTML={{ __html: fillVariables(html) }} />
            </div>
          ) : (
            <div className="wo-editor">
              <ReactQuill theme="snow" value={html} onChange={setHtml} modules={modules} />
            </div>
          )}

          {/* Footer — always visible */}
          <PageFooter />
        </div>
      </div>

      <style jsx global>{`
        .wo-editor .ql-container { font-size: 13px; font-family: Arial, sans-serif; border: none !important; }
        .wo-editor .ql-editor { min-height: 800px; padding: 0 50px 40px !important; line-height: 1.7; overflow-wrap: break-word; }
        .wo-editor .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e5e7eb !important; padding: 8px 16px; position: sticky; top: 0; z-index: 10; background: white; }
        .wo-page .ql-editor h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .wo-page .ql-editor h2 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .wo-page .ql-editor h3 { font-size: 1.17em; font-weight: bold; margin: 0.5em 0; }
        .wo-page .ql-editor .ql-size-small { font-size: 0.75em; }
        .wo-page .ql-editor .ql-size-large { font-size: 1.5em; }
        .wo-page .ql-editor .ql-size-huge { font-size: 2.5em; }
        .wo-page .ql-editor .ql-align-center { text-align: center; }
        .wo-page .ql-editor .ql-align-right { text-align: right; }
        .wo-page .ql-editor .ql-align-justify { text-align: justify; }
        .wo-page .ql-editor .ql-indent-1 { padding-left: 3em; }
        .wo-page .ql-editor .ql-indent-2 { padding-left: 6em; }
        .wo-page .ql-editor ol, .wo-page .ql-editor ul { padding-left: 1.5em; }
        .wo-page .ql-editor blockquote { border-left: 4px solid #ccc; padding-left: 16px; margin: 8px 0; color: #666; }
        .wo-page .ql-editor img { max-width: 100%; }
        .wo-page .ql-editor a { color: #06c; text-decoration: underline; }
      `}</style>
    </div>
  );
}
