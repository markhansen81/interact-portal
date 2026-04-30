"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

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

const DEFAULT_TEMPLATE = `<div style="text-align: right; font-size: 12px; color: #666;">InterACT English gGmbH<br>Planufer 92B, 10967 Berlin<br>Tel. 030 20339702<br>info@interactenglish.de<br>Geschäftsführer:<br>Mark William Hansen &amp; Charles Justin Beard<br>Handelsregister - Amtsgericht Charlottenburg<br>HRB 188932 B</div><p style="text-align: right;"><strong style="color: #16a34a;">Project ID (for office use): {{ProjectID}}</strong></p><h1>WORK ORDER</h1><p>By and between</p><p><strong>InterACT English gGmbH</strong><br>(referred to in the following as "the Company")</p><p>and: <strong>{{TeachingArtist}}</strong><br>(referred to in the following as "the Contractor")</p><h3>Project Details (Location, date, project type, specific project remuneration)</h3><p>The Contractor shall be teaching on the following project (Project details are subject to change):</p><p><strong>Date of project / Time period:</strong> {{Date}}, {{Days}}<br><strong>Organisation (workplace):</strong> {{Name}}<br>{{Address}}<br>{{State}}<br><strong>Project type:</strong> {{ProjectType}}<br><strong>Special conditions:</strong> <em>{{SpecialConditions}}</em><br><strong>Co taught / Not co taught:</strong> {{CoTaught}}<br><strong>Grade:</strong> {{Grade}}<br><strong>Accommodation:</strong> {{Accommodation}}</p><h3>IMPORTANT: Before signing this work order please do and consider the following:</h3><ol><li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. This has the obvious reason that we must ensure that teaching staff arrives on time to run the program. Same day travel may be organised by InterACT in some exceptions, but it remains in the companies judgment if this is warranted/possible or not. Travel the day before is included in the flat-fee paid for every program. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li><li>Check the address of the school/hostel you will travel to. Some projects require longer travel time. Please consider this before signing the work order.</li><li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food, or a supermarket can be difficult in rural locations. Please be prepared before you travel.</strong> This might mean packing some food, or bringing essentials.</li><li>Please CAREFULLY read the project notes prepared for you in the project folder the week before traveling. These notes have critical information that impacts the project and your travel plans.</li><li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance of your project.</strong></li></ol><p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share to why you are declining the work order.</p><p>We may have open positions available and would love to find the right project for you.</p><p>We thank you for all of your input and wish you a successful projects!</p><hr><p>With this signature I accept the Work Order:</p><p><br><br></p><p><strong>{{TeachingArtist}}</strong><br><em>Teaching Artist (Contractor)</em></p><p>Berlin, {{CreatedDate}}</p><p><strong>C. Justin Beard</strong><br>Chief Executive Officer<br>InterACT English gGmbH</p><hr><p style="font-size: 11px; color: #999;">Office address: Gneisenaustr. 64, 10961 Berlin, Germany<br>Billing address: Planufer 92B, 10967 Berlin, Germany<br>Managing Directors: Mark William Hansen &amp; Charles Justin Beard<br>Handelsregister - Amtsgericht Charlottenburg - HRB 188932 B</p>`;

export function WorkOrderTemplateEditor({ template }: { template: Template | null }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: template?.body_html || DEFAULT_TEMPLATE,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[600px] p-6",
      },
    },
  });

  const insertTag = useCallback(
    (tag: string) => {
      editor?.chain().focus().insertContent(tag).run();
    },
    [editor]
  );

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
      .replace(/\{\{TeachingArtist\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Jane Smith</mark>')
      .replace(/\{\{TeachingArtistEmail\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">jane@example.com</mark>')
      .replace(/\{\{ProjectID\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">WO-ABC123</mark>')
      .replace(/\{\{Date\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">2026-05-18 — 2026-05-22</mark>')
      .replace(/\{\{Days\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">5 days</mark>')
      .replace(/\{\{Name\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Realschule Maria Stern</mark>')
      .replace(/\{\{Address\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Schulstraße 12, 86150 Augsburg</mark>')
      .replace(/\{\{State\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">BAYERN</mark>')
      .replace(/\{\{ProjectType\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Native Speaker Week</mark>')
      .replace(/\{\{SpecialConditions\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">None</mark>')
      .replace(/\{\{CoTaught\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Not co taught</mark>')
      .replace(/\{\{Grade\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">8. Kl.</mark>')
      .replace(/\{\{Accommodation\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Hotel Ibis</mark>')
      .replace(/\{\{Total\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">€560.00</mark>')
      .replace(/\{\{DailyRate\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">€112.00</mark>')
      .replace(/\{\{PayLevel\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">Level 5</mark>')
      .replace(/\{\{SignByDate\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">2026-05-10</mark>')
      .replace(/\{\{CreatedDate\}\}/g, '<mark style="background: #dbeafe; padding: 2px 4px; border-radius: 3px;">' + new Date().toLocaleDateString() + '</mark>');
  }

  if (!editor) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Variable Tags Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">Insert Variable</h3>
          <p className="text-[10px] text-zinc-400 mb-3">Click to insert at cursor</p>
          {["Project", "TA", "Pay", "Admin"].map((group) => (
            <div key={group} className="mb-3">
              <p className="text-[10px] font-medium uppercase text-zinc-400 mb-1">{group}</p>
              <div className="space-y-0.5">
                {VARIABLE_TAGS.filter((t) => t.group === group).map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => insertTag(tag.tag)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {tag.tag.replace(/\{\{|\}\}/g, "")}
                    </span>
                    <span className="text-zinc-500">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Link href="/admin/work-orders" className="block text-center text-sm text-zinc-500 hover:text-zinc-700">
          &larr; Back to Work Orders
        </Link>
      </div>

      {/* Editor */}
      <div className="lg:col-span-3 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">B</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><em>I</em></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><u>U</u></ToolBtn>
            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">H1</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">H2</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">H3</ToolBtn>
            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left">L</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">C</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right">R</ToolBtn>
            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">-</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">1.</ToolBtn>
            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Line">—</ToolBtn>
          </div>

          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                showPreview
                  ? "bg-blue-100 text-blue-700"
                  : "border border-zinc-300 text-zinc-600 dark:border-zinc-700"
              }`}
            >
              {showPreview ? "Editing" : "Preview"}
            </button>
            {template && <span className="text-xs text-zinc-400">v{template.version}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Editor or Preview */}
        {showPreview ? (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">Preview — variable tags shown in <mark style={{ background: "#dbeafe", padding: "1px 4px", borderRadius: "3px", fontSize: "11px" }}>blue</mark></span>
            </div>
            <div className="p-8">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
