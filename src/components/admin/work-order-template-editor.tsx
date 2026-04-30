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
  { tag: "{{ProjectID}}", label: "Project ID (internal)", group: "Project" },
  { tag: "{{MondayID}}", label: "Monday Task ID", group: "Project" },
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
  { tag: "{{DailyRate}}", label: "Daily Rate", group: "Pay" },
  { tag: "{{PayLevel}}", label: "Level", group: "Pay" },
  { tag: "{{SignByDate}}", label: "Sign-by Date", group: "Admin" },
  { tag: "{{CreatedDate}}", label: "Created Date", group: "Admin" },
];

const DEFAULT_TEMPLATE = `<h1><strong>WORK ORDER</strong></h1>
<p>By and between</p>
<p><strong>InterACT English gGmbH</strong></p>
<p><em>(referred to in the following as "the Company")</em></p>
<p>and: <strong>{{TeachingArtist}}</strong></p>
<p><em>(referred to in the following as "the Contractor")</em></p>
<p><br></p>
<h2>Project Details</h2>
<p>The Contractor shall be teaching on the following project (Project details are subject to change):</p>
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
<h2>IMPORTANT: Before signing this work order</h2>
<ol>
<li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. Travel the day before is included in the flat-fee. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
<li>Check the address of the school/hostel you will travel to. Some projects require longer travel time.</li>
<li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food can be difficult in rural locations.</strong></li>
<li>Please CAREFULLY read the project notes prepared for you in the project folder the week before traveling.</li>
<li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance.</strong></li>
</ol>
<p><br></p>
<p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share.</p>
<p>We may have open positions available and would love to find the right project for you.</p>
<p>We thank you for all of your input and wish you successful projects!</p>
<p><br></p>
<p>With this signature I accept the Work Order:</p>
<p><br></p>
<p><br></p>
<p>___________________________________</p>
<p><strong>{{TeachingArtist}}</strong></p>
<p><em>Teaching Artist (Contractor)</em></p>
<p><br></p>
<p><strong>Berlin, {{CreatedDate}}</strong></p>
<p><strong>C. Justin Beard</strong></p>
<p>Chief Executive Officer</p>
<p>InterACT English gGmbH</p>
<p><br></p>
<p><em>InterACT English gGmbH, Planufer 92B, 10967 Berlin</em></p>
<p><em>Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de</em></p>`;

export function WorkOrderTemplateEditor({ template }: { template: Template | null }) {
  const [html, setHtml] = useState(template?.body_html || DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        ["link", "image"],
        ["blockquote"],
        ["clean"],
      ],
    }),
    []
  );

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

  function getPreviewHtml() {
    return html.replace(/\{\{(\w+)\}\}/g, (_match, v) => {
      const data: Record<string, string> = {
        TeachingArtist: "Jane Smith", TeachingArtistEmail: "jane@example.com",
        ProjectID: "WO-ABC123", MondayID: "10037723799", Date: "18.05.2026 — 22.05.2026", Days: "5 days",
        Name: "Realschule Maria Stern Augsburg", Address: "Schulstraße 12, 86150 Augsburg",
        State: "BAYERN", ProjectType: "Native Speaker Week", SpecialConditions: "None",
        CoTaught: "Not co taught", Grade: "8. Kl.", Accommodation: "Hotel Ibis",
        Total: "€560.00", DailyRate: "€112.00", PayLevel: "Level 5",
        SignByDate: "10.05.2026", CreatedDate: new Date().toLocaleDateString("de-DE"),
      };
      return `<span style="background:#dbeafe;padding:2px 6px;border-radius:4px;font-weight:600;">${data[v] || v}</span>`;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Variables</h3>
          <p className="text-[10px] text-zinc-400 mb-3">Click to copy, then paste into editor</p>
          {["Project", "TA", "Pay", "Admin"].map((group) => (
            <div key={group} className="mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">{group}</p>
              <div className="space-y-0.5">
                {VARIABLE_TAGS.filter((t) => t.group === group).map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => {
                      navigator.clipboard.writeText(tag.tag);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-zinc-800 active:bg-blue-100"
                  >
                    <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                      {tag.tag.replace(/\{\{|\}\}/g, "")}
                    </span>
                    <span className="text-zinc-500 truncate">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Link href="/admin/work-orders" className="block text-center text-sm text-zinc-500 hover:text-zinc-700">&larr; Back</Link>
      </div>

      {/* Editor */}
      <div className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-end gap-2">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button onClick={() => setShowPreview(!showPreview)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${showPreview ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            {showPreview ? "Edit" : "Preview"}
          </button>
          {template && <span className="text-[10px] text-zinc-400">v{template.version}</span>}
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            {saving ? "..." : "Save"}
          </button>
        </div>

        {showPreview ? (
          <div className="rounded-xl border border-zinc-300 bg-white shadow-lg mx-auto" style={{ width: 794, minHeight: 1123, position: "relative" }}>
            {/* A4 ratio: 210mm x 297mm = 794px x 1123px at 96dpi */}
            <div style={{ padding: "60px 60px 80px", fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.6, overflowWrap: "break-word", wordWrap: "break-word" }}
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
            {/* Footer */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid #e5e7eb", padding: "12px 60px", display: "flex", alignItems: "center", gap: 12 }}>
              <img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="" style={{ width: 80 }} />
              <div style={{ fontSize: 9, color: "#999", lineHeight: 1.4 }}>
                InterACT English gGmbH, Planufer 92B, 10967 Berlin<br />
                Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-300 bg-white shadow-lg overflow-hidden wo-editor mx-auto" style={{ width: 794 }}>
            <ReactQuill theme="snow" value={html} onChange={setHtml} modules={modules}
              style={{ minHeight: 1000, fontFamily: "Arial, sans-serif" }} />
          </div>
        )}
      </div>

      <style jsx global>{`
        .wo-editor .ql-container { font-size: 14px; font-family: Arial, sans-serif; }
        .wo-editor .ql-editor { min-height: 1000px; padding: 60px; line-height: 1.6; overflow-wrap: break-word; word-wrap: break-word; }
        .wo-editor .ql-toolbar { border-bottom: 1px solid #e5e7eb; padding: 8px 12px; position: sticky; top: 0; z-index: 10; background: white; }
        .wo-editor .ql-container { border: none; }
        .wo-editor .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #e5e7eb; }
      `}</style>
    </div>
  );
}
