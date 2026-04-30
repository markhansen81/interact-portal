"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">

<div style="display: flex; justify-content: space-between; align-items: flex-start;">
<div><img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="InterACT English" style="width: 180px;" /></div>
<div style="text-align: right; font-size: 11px; color: #666; line-height: 1.5;">
InterACT English gGmbH<br>
Planufer 92B, 10967 Berlin<br>
Tel. 030 20339702<br>
info@interactenglish.de<br>
<br>
Geschäftsführer:<br>
Mark William Hansen &amp; Charles Justin Beard<br>
Handelsregister - Amtsgericht Charlottenburg<br>
HRB 188932 B
</div>
</div>

<p style="text-align: right; margin-top: 16px;"><span style="color: #16a34a; font-weight: bold;">Project ID (for office use): {{ProjectID}}</span></p>

<hr style="border: none; border-top: 2px solid #333; margin: 24px 0;">

<h1 style="font-size: 36px; font-weight: 900; letter-spacing: -1px; margin: 0;">WORK ORDER</h1>

<p style="font-size: 14px; margin-top: 16px;">By and between</p>

<p style="font-size: 14px;"><strong>InterACT English gGmbH</strong><br>
<span style="color: #666;">(referred to in the following as "the Company")</span></p>

<p style="font-size: 14px;">and: <strong>{{TeachingArtist}}</strong><br>
<span style="color: #666;">(referred to in the following as "the Contractor")</span></p>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<h3 style="font-size: 16px; font-weight: 700;">Project Details <span style="font-weight: 400; color: #666;">(Location, date, project type, specific project remuneration)</span></h3>
<p style="font-size: 13px; color: #666;">The Contractor shall be teaching on the following project (Project details are subject to change):</p>

<table style="width: 100%; font-size: 14px; margin: 16px 0; border-collapse: collapse;">
<tr><td style="padding: 6px 0; width: 240px; font-weight: bold;">Date of project / Time period:</td><td style="padding: 6px 0;">{{Date}}, {{Days}}</td></tr>
<tr><td style="padding: 6px 0; font-weight: bold;">Organisation (workplace):</td><td style="padding: 6px 0;">{{Name}}</td></tr>
<tr><td style="padding: 6px 0;"></td><td style="padding: 6px 0;">{{Address}}</td></tr>
<tr><td style="padding: 6px 0;"></td><td style="padding: 6px 0;">{{State}}</td></tr>
<tr><td style="padding: 6px 0; font-weight: bold;">Project type:</td><td style="padding: 6px 0;">{{ProjectType}}</td></tr>
<tr><td style="padding: 6px 0; font-weight: bold;">Special conditions:</td><td style="padding: 6px 0; font-style: italic;">{{SpecialConditions}}</td></tr>
<tr><td style="padding: 6px 0; font-weight: bold;">Co taught / Not co taught:</td><td style="padding: 6px 0;">{{CoTaught}}</td></tr>
<tr><td style="padding: 6px 0; font-weight: bold;">Grade:</td><td style="padding: 6px 0;">{{Grade}}</td></tr>
<tr><td style="padding: 6px 0; font-weight: bold;">Accommodation:</td><td style="padding: 6px 0;">{{Accommodation}}</td></tr>
</table>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

<h3 style="font-size: 14px; font-weight: 700;">IMPORTANT: Before signing this work order please do and consider the following:</h3>

<ol style="font-size: 13px; line-height: 1.7; padding-left: 20px;">
<li style="margin-bottom: 12px;"><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. This has the obvious reason that we must ensure that teaching staff arrives on time to run the program. Same day travel may be organised by InterACT in some exceptions, but it remains in the companies judgment if this is warranted/possible or not. Travel the day before is included in the flat-fee paid for every program. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
<li style="margin-bottom: 12px;">Check the address of the school/hostel you will travel to. Some projects require longer travel time. Please consider this before signing the work order.</li>
<li style="margin-bottom: 12px;">Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food, or a supermarket can be difficult in rural locations. Please be prepared before you travel.</strong> This might mean packing some food, or bringing essentials.</li>
<li style="margin-bottom: 12px;">Please CAREFULLY read the project notes prepared for you in the project folder <u>the week before traveling</u>. These notes have critical information that impacts the project and your travel plans. If anything is unclear contact the project coordinator during working hours (M-F) and we can answer your questions.</li>
<li style="margin-bottom: 12px;"><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance of your project.</strong> We always endeavour to provide accurate information but mistakes do happen. You can prevent complications and frustration by double checking all details of this project before you travel. Details can be found in your project notes.</li>
</ol>

<div style="font-size: 13px; margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 8px;">
<p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share to why you are declining the work order.</p>
<p style="margin-top: 8px;">We may have open positions available and would love to find the right project for you.</p>
<p style="margin-top: 8px;">We thank you for all of your input and wish you a successful projects!</p>
</div>

<hr style="border: none; border-top: 2px solid #333; margin: 32px 0;">

<p style="font-size: 14px;">With this signature I accept the Work Order:</p>

<div style="display: flex; gap: 40px; margin-top: 40px;">
<div style="flex: 1;">
<div style="border-bottom: 1px solid #333; height: 60px;"></div>
<p style="font-size: 14px; margin-top: 8px;"><strong>{{TeachingArtist}}</strong><br><em style="color: #666;">Teaching Artist (Contractor)</em></p>
</div>
<div style="flex: 1;">
<p style="font-size: 14px; margin-top: 40px;"><strong>Berlin, {{CreatedDate}}</strong></p>
<p style="font-size: 14px; margin-top: 16px;"><strong>C. Justin Beard</strong><br>Chief Executive Officer<br>InterACT English gGmbH</p>
</div>
</div>

<hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;">

<div style="display: flex; align-items: center; gap: 16px;">
<img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="InterACT English" style="width: 120px;" />
<div style="font-size: 11px; color: #999;">
InterACT English gGmbH, Planufer 92B, 10967 Berlin<br>
Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de
</div>
</div>

</div>`;

export function WorkOrderTemplateEditor({ template }: { template: Template | null }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  function insertTag(tag: string) {
    exec("insertHTML", `<span style="background: #dbeafe; padding: 1px 6px; border-radius: 4px; font-weight: 600; color: #0369a1; white-space: nowrap;">${tag}</span>&nbsp;`);
  }

  function insertImage() {
    const url = prompt("Image URL:");
    if (url) exec("insertImage", url);
  }

  async function handleSave() {
    if (!editorRef.current) return;
    setSaving(true);
    await fetch("/api/admin/work-orders/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body_html: editorRef.current.innerHTML,
        conditions_html: null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function getPreviewHtml() {
    if (!editorRef.current) return "";
    return editorRef.current.innerHTML.replace(
      /\{\{(\w+)\}\}/g,
      (_match, varName) => {
        const data: Record<string, string> = {
          TeachingArtist: "Jane Smith", TeachingArtistEmail: "jane@example.com",
          ProjectID: "WO-ABC123", Date: "18.05.2026 — 22.05.2026", Days: "5 days",
          Name: "Realschule Maria Stern Augsburg", Address: "Schulstraße 12, 86150 Augsburg",
          State: "BAYERN", ProjectType: "Native Speaker Week", SpecialConditions: "None",
          CoTaught: "Not co taught", Grade: "8. Kl.", Accommodation: "Hotel Ibis",
          Total: "€560.00", DailyRate: "€112.00", PayLevel: "Level 5",
          SignByDate: "10.05.2026", CreatedDate: new Date().toLocaleDateString("de-DE"),
        };
        return data[varName] || varName;
      }
    );
  }

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
                  <button key={tag.tag} onClick={() => insertTag(tag.tag)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-zinc-800">
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
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-0.5 flex-wrap">
            <select onChange={(e) => exec("fontSize", e.target.value)} defaultValue="3"
              className="rounded border border-zinc-200 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800">
              <option value="1">Small</option>
              <option value="2">Normal-</option>
              <option value="3">Normal</option>
              <option value="4">Medium</option>
              <option value="5">Large</option>
              <option value="6">X-Large</option>
              <option value="7">Huge</option>
            </select>
            <Sep />
            <TB onClick={() => exec("bold")} title="Bold"><strong>B</strong></TB>
            <TB onClick={() => exec("italic")} title="Italic"><em>I</em></TB>
            <TB onClick={() => exec("underline")} title="Underline"><u>U</u></TB>
            <TB onClick={() => exec("strikeThrough")} title="Strikethrough"><s>S</s></TB>
            <Sep />
            <TB onClick={() => exec("formatBlock", "H1")} title="Title">H1</TB>
            <TB onClick={() => exec("formatBlock", "H2")} title="Subtitle">H2</TB>
            <TB onClick={() => exec("formatBlock", "H3")} title="Section">H3</TB>
            <TB onClick={() => exec("formatBlock", "P")} title="Paragraph">P</TB>
            <Sep />
            <TB onClick={() => exec("justifyLeft")} title="Left">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm0 4h8v1.5H2zm0 4h12v1.5H2zm0 4h8v1.5H2z"/></svg>
            </TB>
            <TB onClick={() => exec("justifyCenter")} title="Center">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm2 4h8v1.5H4zm-2 4h12v1.5H2zm2 4h8v1.5H4z"/></svg>
            </TB>
            <TB onClick={() => exec("justifyRight")} title="Right">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm4 4h8v1.5H6zm-4 4h12v1.5H2zm4 4h8v1.5H6z"/></svg>
            </TB>
            <Sep />
            <TB onClick={() => exec("insertUnorderedList")} title="Bullets">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><circle cx="3" cy="4" r="1.5"/><path d="M6 3h8v1.5H6z"/><circle cx="3" cy="8" r="1.5"/><path d="M6 7h8v1.5H6z"/><circle cx="3" cy="12" r="1.5"/><path d="M6 11h8v1.5H6z"/></svg>
            </TB>
            <TB onClick={() => exec("insertOrderedList")} title="Numbers">1.</TB>
            <Sep />
            <TB onClick={() => exec("insertHorizontalRule")} title="Line">—</TB>
            <TB onClick={insertImage} title="Image">IMG</TB>
            <Sep />
            <input type="color" defaultValue="#000000" onChange={(e) => exec("foreColor", e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-200" title="Text color" />
            <input type="color" defaultValue="#ffffff" onChange={(e) => exec("hiliteColor", e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-200" title="Highlight" />
          </div>

          <div className="flex items-center gap-2">
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
        </div>

        {/* Document */}
        {showPreview ? (
          <div className="rounded-xl border border-zinc-300 bg-white shadow-lg" style={{ minHeight: 900 }}>
            <div style={{ padding: "60px", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.6, color: "#1a1a1a" }}
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
          </div>
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="rounded-xl border border-zinc-300 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ padding: "60px", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.6, color: "#1a1a1a", minHeight: 900 }}
            dangerouslySetInnerHTML={{ __html: template?.body_html || DEFAULT_TEMPLATE }}
          />
        )}
      </div>
    </div>
  );
}

function TB({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800">
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-zinc-200 mx-0.5" />;
}
