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

const DEFAULT_TEMPLATE = `<p class="ql-align-right"><img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" width="180"></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">InterACT English gGmbH</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">Planufer 92B, 10967 Berlin</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">Tel. 030 20339702</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">info@interactenglish.de</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">Geschäftsführer:</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">Mark William Hansen &amp; Charles Justin Beard</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">Handelsregister - Amtsgericht Charlottenburg</span></p>
<p class="ql-align-right"><span class="ql-size-small" style="color: rgb(102, 102, 102);">HRB 188932 B</span></p>
<p class="ql-align-right"><br></p>
<p class="ql-align-right"><strong style="color: rgb(22, 163, 74);">Project ID (for office use): {{MondayID}}</strong></p>
<p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
<p><br></p>
<h1><strong>WORK ORDER</strong></h1>
<p><br></p>
<p>By and between</p>
<p><br></p>
<p><strong>InterACT English gGmbH</strong></p>
<p><em>(referred to in the following as "the Company")</em></p>
<p><br></p>
<p>and: <strong>{{TeachingArtist}}</strong></p>
<p><em>(referred to in the following as "the Contractor")</em></p>
<p><br></p>
<p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
<p><br></p>
<h2><strong>Project Details</strong> <em>(Location, date, project type, specific project remuneration)</em></h2>
<p>The Contractor shall be teaching on the following project (Project details are subject to change):</p>
<p><br></p>
<p><strong>Date of project / Time period:</strong>   {{Date}}, {{Days}}</p>
<p><strong>Organisation (workplace):</strong>   {{Name}}</p>
<p>                                                          {{Address}}</p>
<p>                                                          {{State}}</p>
<p><strong>Project type:</strong>   {{ProjectType}}</p>
<p><strong>Special conditions:</strong>   <em>{{SpecialConditions}}</em></p>
<p><strong>Co taught / Not co taught:</strong>   {{CoTaught}}</p>
<p><strong>Grade:</strong>   {{Grade}}</p>
<p><strong>Accommodation:</strong>   {{Accommodation}}</p>
<p><br></p>
<p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
<p><br></p>
<h3><strong>IMPORTANT:</strong> Before signing this work order please do and consider the following:</h3>
<p><br></p>
<ol>
<li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. This has the obvious reason that we must ensure that teaching staff arrives on time to run the program. Same day travel may be organised by InterACT in some exceptions, but it remains in the companies judgment if this is warranted/possible or not. Travel the day before is included in the flat-fee paid for every program. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
<li>Check the address of the school/hostel you will travel to. Some projects require longer travel time. Please consider this before signing the work order.</li>
<li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food, or a supermarket can be difficult in rural locations. Please be prepared before you travel.</strong> This might mean packing some food, or bringing essentials.</li>
<li>Please CAREFULLY read the project notes prepared for you in the project folder the week before traveling. These notes have critical information that impacts the project and your travel plans. If anything is unclear contact the project coordinator during working hours (M-F) and we can answer your questions.</li>
<li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance of your project.</strong> We always endeavour to provide accurate information but mistakes do happen. You can prevent complications and frustration by double checking all details of this project before you travel.</li>
</ol>
<p><br></p>
<p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share to why you are declining the work order.</p>
<p><br></p>
<p>We may have open positions available and would love to find the right project for you.</p>
<p><br></p>
<p>Reasons include: needing a project closer to your hometown, that you can only work certain days, or that you are looking for a certain type of project for the week. In some cases we may be able to provide alternative projects in this period that meet your requirements.</p>
<p><br></p>
<p>We thank you for all of your input and wish you a successful projects!</p>`;

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
          <p className="text-[10px] text-zinc-400 mb-3">Click to copy, then paste (Ctrl+V) into editor</p>
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
        <Link href="/admin/work-orders" className="block text-center text-sm text-zinc-500 hover:text-zinc-700">&larr; Back</Link>
      </div>

      {/* Editor / Preview */}
      <div className="lg:col-span-4 space-y-3">
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
        {showPreview ? (
          <div className="wo-page mx-auto ql-snow" style={{ width: 794, background: "white", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb" }}>
            <div className="ql-editor" style={{ padding: "50px 50px 0", fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.7, overflowWrap: "break-word" }}
              dangerouslySetInnerHTML={{ __html: fillVariables(html) }} />
            <SignatureAreaPreview taName={SAMPLE_DATA.TeachingArtist} date={SAMPLE_DATA.CreatedDate} />
          </div>
        ) : (
          <div className="wo-page mx-auto" style={{ width: 794, background: "white", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div className="wo-editor">
              <ReactQuill theme="snow" value={html} onChange={setHtml} modules={modules} />
            </div>
            <SignatureAreaPreview taName="{{TeachingArtist}}" date="{{CreatedDate}}" />
          </div>
        )}
      </div>

      <SignatureAreaInfo />

      <style jsx global>{`
        .wo-editor .ql-container { font-size: 13px; font-family: Arial, sans-serif; border: none !important; }
        .wo-editor .ql-editor { min-height: 1023px; padding: 50px !important; line-height: 1.7; overflow-wrap: break-word; }
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

function SignatureAreaPreview({ taName, date }: { taName: string; date: string }) {
  return (
    <div style={{ padding: "0 50px 50px", fontFamily: "Arial, sans-serif", fontSize: 13 }}>
      {/* Divider */}
      <div style={{ borderTop: "2px solid #1a1a1a", margin: "24px 0" }} />

      <p style={{ fontSize: 14, marginBottom: 24 }}>With this signature I accept the Work Order:</p>

      {/* Signature fields */}
      <div style={{ display: "flex", gap: 40, marginTop: 16 }}>
        {/* TA Signature */}
        <div style={{ flex: 1 }}>
          {/* Signature box */}
          <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, height: 80, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, background: "#f8fafc" }}>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>✍ Signature (draw or type)</span>
          </div>

          {/* Place + Date fields */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: "1px solid #333", height: 28, display: "flex", alignItems: "flex-end" }}>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>place</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: "1px solid #333", height: 28, display: "flex", alignItems: "flex-end" }}>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>date</span>
              </div>
            </div>
          </div>

          <p style={{ fontWeight: "bold", margin: "4px 0" }}>{taName}</p>
          <p style={{ fontStyle: "italic", color: "#666", margin: 0, fontSize: 12 }}>Teaching Artist (Contractor)</p>
        </div>

        {/* Company Signature */}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: "bold", marginBottom: 4 }}>Berlin, {date}</p>
          <div style={{ margin: "16px 0" }}>
            <img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="InterACT" style={{ width: 100, opacity: 0.7 }} />
          </div>
          <p style={{ fontWeight: "bold", margin: "4px 0" }}>C. Justin Beard</p>
          <p style={{ margin: "2px 0", fontSize: 12 }}>Chief Executive Officer</p>
          <p style={{ margin: "2px 0", fontSize: 12 }}>InterACT English gGmbH</p>
        </div>
      </div>

      {/* Legal footer */}
      <div style={{ borderTop: "1px solid #ddd", marginTop: 32, paddingTop: 12 }}>
        <p style={{ fontSize: 10, color: "#999", margin: "2px 0" }}>Office address: Gneisenaustr. 64, 10961 Berlin, Germany</p>
        <p style={{ fontSize: 10, color: "#999", margin: "2px 0" }}>Billing address: Planufer 92B, 10967 Berlin, Germany</p>
        <p style={{ fontSize: 10, color: "#999", margin: "2px 0" }}>Managing Directors: Mark William Hansen &amp; Charles Justin Beard</p>
        <p style={{ fontSize: 10, color: "#999", margin: "2px 0" }}>Handelsregister - Amtsgericht Charlottenburg - HRB 188932 B</p>
      </div>

      {/* Page footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 24, paddingTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <img src="https://interactenglish.de/wp-content/uploads/2023/01/interact-logo.png" alt="" style={{ width: 80 }} />
        <div style={{ fontSize: 9, color: "#999" }}>
          InterACT English gGmbH, Planufer 92B, 10967 Berlin<br />
          Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de
        </div>
      </div>
    </div>
  );
}

function SignatureAreaInfo() {
  return (
    <div className="lg:col-span-4 lg:col-start-2 mx-auto" style={{ width: 794 }}>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
        <strong>Signature area</strong> is fixed below your template content. When a TA receives the work order, they will see a signature pad (draw or type) in place of the dashed box above. Place and date fields are filled automatically.
      </div>
    </div>
  );
}
