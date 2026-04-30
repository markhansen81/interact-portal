"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";

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
  { tag: "{{ProjectID}}", label: "Project ID", group: "Project" },
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

const FONT_SIZES = ["11px", "12px", "13px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const DEFAULT_TEMPLATE = `<p><img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="InterACT English" style="width: 200px;" /></p>
<p style="text-align: right; font-size: 12px; color: #666;">InterACT English gGmbH<br>Planufer 92B, 10967 Berlin<br>Tel. 030 20339702<br>info@interactenglish.de<br><br>Geschäftsführer:<br>Mark William Hansen &amp; Charles Justin Beard<br>Handelsregister - Amtsgericht Charlottenburg<br>HRB 188932 B</p>
<p style="text-align: right;"><strong>Project ID (for office use): {{ProjectID}}</strong></p>
<hr>
<h1><strong>WORK ORDER</strong></h1>
<p>By and between</p>
<p><strong>InterACT English gGmbH</strong><br>(referred to in the following as "the Company")</p>
<p>and: <strong>{{TeachingArtist}}</strong><br>(referred to in the following as "the Contractor")</p>
<hr>
<h3><strong>Project Details</strong> (Location, date, project type, specific project remuneration)</h3>
<p>The Contractor shall be teaching on the following project (Project details are subject to change):</p>
<p><strong>Date of project / Time period:</strong> {{Date}}, {{Days}}<br><strong>Organisation (workplace):</strong> {{Name}}<br>{{Address}}<br>{{State}}<br><strong>Project type:</strong> {{ProjectType}}<br><strong>Special conditions:</strong> <em>{{SpecialConditions}}</em><br><strong>Co taught / Not co taught:</strong> {{CoTaught}}<br><strong>Grade:</strong> {{Grade}}<br><strong>Accommodation:</strong> {{Accommodation}}</p>
<hr>
<h3>IMPORTANT: Before signing this work order please do and consider the following:</h3>
<ol>
<li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. Travel the day before is included in the flat-fee. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
<li>Check the address of the school/hostel you will travel to. Some projects require longer travel time.</li>
<li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food can be difficult in rural locations. Please be prepared.</strong></li>
<li>Please CAREFULLY read the project notes prepared for you in the project folder the week before traveling.</li>
<li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance.</strong></li>
</ol>
<p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share.</p>
<p>We may have open positions available and would love to find the right project for you.</p>
<p>We thank you for all of your input and wish you a successful projects!</p>
<hr>
<p>With this signature I accept the Work Order:</p>
<p><br><br></p>
<table style="width: 100%;">
<tr>
<td style="width: 50%; vertical-align: top;">
<hr>
<p><strong>{{TeachingArtist}}</strong><br><em>Teaching Artist (Contractor)</em></p>
</td>
<td style="width: 50%; vertical-align: top;">
<p><strong>Berlin, {{CreatedDate}}</strong></p>
<p><strong>C. Justin Beard</strong><br>Chief Executive Officer<br>InterACT English gGmbH</p>
</td>
</tr>
</table>
<hr>
<p style="font-size: 11px; color: #999;">InterACT English gGmbH, Planufer 92B, 10967 Berlin<br>Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de</p>`;

export function WorkOrderTemplateEditor({ template }: { template: Template | null }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fontSize, setFontSize] = useState("14px");
  const router = useRouter();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: template?.body_html || DEFAULT_TEMPLATE,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[700px]",
        style: `font-family: Arial, sans-serif; font-size: ${fontSize}; line-height: 1.6; padding: 40px 60px; color: #1a1a1a;`,
      },
    },
  });

  const insertTag = useCallback(
    (tag: string) => {
      editor?.chain().focus().insertContent(`<strong style="background: #e0f2fe; padding: 1px 6px; border-radius: 4px; color: #0369a1;">${tag}</strong>`).run();
    },
    [editor]
  );

  const insertImage = useCallback(() => {
    const url = prompt("Image URL:");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    await fetch("/api/admin/work-orders/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body_html: editor.getHTML(),
        conditions_html: null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function getPreviewHtml() {
    if (!editor) return "";
    return editor
      .getHTML()
      .replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
        const sampleData: Record<string, string> = {
          TeachingArtist: "Jane Smith",
          TeachingArtistEmail: "jane@example.com",
          ProjectID: "WO-ABC123",
          Date: "18.05.2026 — 22.05.2026",
          Days: "5 days",
          Name: "Realschule Maria Stern Augsburg",
          Address: "Schulstraße 12, 86150 Augsburg",
          State: "BAYERN",
          ProjectType: "Native Speaker Week",
          SpecialConditions: "None",
          CoTaught: "Not co taught",
          Grade: "8. Kl.",
          Accommodation: "Hotel Ibis, single room",
          Total: "€560.00",
          DailyRate: "€112.00",
          PayLevel: "Level 5",
          SignByDate: "10.05.2026",
          CreatedDate: new Date().toLocaleDateString("de-DE"),
        };
        const val = sampleData[varName] || varName;
        return `<span style="background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${val}</span>`;
      });
  }

  if (!editor) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Variables</h3>
          {["Project", "TA", "Pay", "Admin"].map((group) => (
            <div key={group} className="mb-3">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">{group}</p>
              <div className="space-y-0.5">
                {VARIABLE_TAGS.filter((t) => t.group === group).map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => insertTag(tag.tag)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-zinc-800"
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
        <Link href="/admin/work-orders" className="block text-center text-sm text-zinc-500 hover:text-zinc-700">
          &larr; Back
        </Link>
      </div>

      {/* Editor */}
      <div className="lg:col-span-4 space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Font size */}
            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                if (editor.view.dom) {
                  (editor.view.dom as HTMLElement).style.fontSize = e.target.value;
                }
              }}
              className="rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="w-px h-5 bg-zinc-200 mx-1" />

            {/* Format */}
            <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><strong>B</strong></TB>
            <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><em>I</em></TB>
            <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><u>U</u></TB>
            <div className="w-px h-5 bg-zinc-200 mx-1" />

            {/* Headings */}
            <TB onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Title">H1</TB>
            <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Subtitle">H2</TB>
            <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Section">H3</TB>
            <TB onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragraph">P</TB>
            <div className="w-px h-5 bg-zinc-200 mx-1" />

            {/* Align */}
            <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left align">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm0 4h8v1.5H2zm0 4h12v1.5H2zm0 4h8v1.5H2z"/></svg>
            </TB>
            <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm2 4h8v1.5H4zm-2 4h12v1.5H2zm2 4h8v1.5H4z"/></svg>
            </TB>
            <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right align">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm4 4h8v1.5H6zm-4 4h12v1.5H2zm4 4h8v1.5H6z"/></svg>
            </TB>
            <div className="w-px h-5 bg-zinc-200 mx-1" />

            {/* Lists */}
            <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullets">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><circle cx="3" cy="4" r="1.5"/><path d="M6 3h8v1.5H6z"/><circle cx="3" cy="8" r="1.5"/><path d="M6 7h8v1.5H6z"/><circle cx="3" cy="12" r="1.5"/><path d="M6 11h8v1.5H6z"/></svg>
            </TB>
            <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbers">1.</TB>
            <div className="w-px h-5 bg-zinc-200 mx-1" />

            {/* Insert */}
            <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Line">—</TB>
            <TB onClick={insertImage} title="Image">IMG</TB>
          </div>

          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600">Saved!</span>}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                showPreview ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
            {template && <span className="text-[10px] text-zinc-400">v{template.version}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>

        {/* Document */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900" style={{ minHeight: "900px" }}>
          {showPreview ? (
            <div className="p-[60px]" style={{ fontFamily: "Arial, sans-serif", fontSize, lineHeight: 1.6, color: "#1a1a1a" }}>
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
    </div>
  );
}

function TB({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >{children}</button>
  );
}
