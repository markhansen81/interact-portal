"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

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

const CONTRACT_VARIABLES = [
  { tag: "{{TAName}}", label: "Full Name", group: "Teaching Artist" },
  { tag: "{{TAFirstName}}", label: "First Name", group: "Teaching Artist" },
  { tag: "{{TALastName}}", label: "Last Name", group: "Teaching Artist" },
  { tag: "{{TAEmail}}", label: "Email", group: "Teaching Artist" },
  { tag: "{{TAPhone}}", label: "Phone", group: "Teaching Artist" },
  { tag: "{{TAAddress}}", label: "Full Address", group: "Teaching Artist" },
  { tag: "{{TADateOfBirth}}", label: "Date of Birth", group: "Teaching Artist" },
  { tag: "{{TANationality}}", label: "Nationality", group: "Teaching Artist" },
  { tag: "{{TAIBAN}}", label: "IBAN", group: "Teaching Artist" },
  { tag: "{{TABankName}}", label: "Bank Name", group: "Teaching Artist" },
  { tag: "{{TATaxNumber}}", label: "Tax Number", group: "Teaching Artist" },
  { tag: "{{TAPayLevel}}", label: "Pay Level", group: "Teaching Artist" },
  { tag: "{{ContractDate}}", label: "Contract Date", group: "Contract" },
  { tag: "{{ContractYear}}", label: "Contract Year", group: "Contract" },
  { tag: "{{ContractStartDate}}", label: "Start Date", group: "Contract" },
  { tag: "{{ContractEndDate}}", label: "End Date", group: "Contract" },
  { tag: "{{ContractVersion}}", label: "Version", group: "Contract" },
  { tag: "{{CompanyName}}", label: "Company Name", group: "Company" },
  { tag: "{{CompanyAddress}}", label: "Address", group: "Company" },
  { tag: "{{CompanyDirectors}}", label: "Directors", group: "Company" },
  { tag: "{{CompanyReg}}", label: "Registration", group: "Company" },
];

const SAMPLE_DATA: Record<string, string> = {
  TAName: "Sarah Johnson",
  TAFirstName: "Sarah",
  TALastName: "Johnson",
  TAEmail: "sarah.johnson@test.com",
  TAPhone: "+49 176 1111 1111",
  TAAddress: "Teststrasse 1, 10901 Berlin, Germany",
  TADateOfBirth: "15.03.1992",
  TANationality: "American",
  TAIBAN: "DE89 3704 0044 0532 0130 00",
  TABankName: "N26",
  TATaxNumber: "12/345/67890",
  TAPayLevel: "Level 1",
  ContractDate: new Date().toLocaleDateString("de-DE"),
  ContractYear: new Date().getFullYear().toString(),
  ContractStartDate: `01.01.${new Date().getFullYear()}`,
  ContractEndDate: `31.12.${new Date().getFullYear()}`,
  ContractVersion: "v1",
  CompanyName: "InterACT English gGmbH",
  CompanyAddress: "Planufer 92B, 10967 Berlin",
  CompanyDirectors: "Mark William Hansen & Charles Justin Beard",
  CompanyReg: "HRB 188932 B — Amtsgericht Charlottenburg",
};

const DEFAULT_FRAMEWORK = `<h1><strong>FRAMEWORK CONTRACT</strong></h1>
<p><em>Rahmenvertrag fur freie Mitarbeiter</em></p>
<p><br></p>
<p>By and between</p>
<p><br></p>
<p><strong>{{CompanyName}}</strong></p>
<p>{{CompanyAddress}}</p>
<p><em>(hereinafter referred to as "the Company")</em></p>
<p><br></p>
<p>and</p>
<p><br></p>
<p><strong>{{TAName}}</strong></p>
<p>{{TAAddress}}</p>
<p>Date of Birth: {{TADateOfBirth}}</p>
<p><em>(hereinafter referred to as "the Contractor")</em></p>
<p><br></p>
<p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
<p><br></p>
<h2><strong>§ 1 Subject of the Contract</strong></h2>
<p>This framework contract regulates the general terms and conditions under which the Contractor may be engaged by the Company for individual projects as a freelance Teaching Artist during the contract period.</p>
<p><br></p>
<p>Individual engagements shall be agreed upon by means of separate Work Orders. This framework contract does not constitute an obligation for the Company to issue Work Orders, nor does it constitute an obligation for the Contractor to accept them.</p>
<p><br></p>
<h2><strong>§ 2 Contract Period</strong></h2>
<p>This contract is valid from <strong>{{ContractStartDate}}</strong> until <strong>{{ContractEndDate}}</strong>.</p>
<p><br></p>
<p>The contract may be extended by mutual written agreement. Either party may terminate this framework contract with 30 days written notice.</p>
<p><br></p>
<h2><strong>§ 3 Contractor Status</strong></h2>
<p>The Contractor is engaged as a freelance service provider (freier Mitarbeiter) and is <strong>not</strong> an employee of the Company. The Contractor is responsible for their own tax obligations, social insurance, and health insurance.</p>
<p><br></p>
<h2><strong>§ 4 Remuneration</strong></h2>
<p>Remuneration for individual projects shall be agreed upon in each Work Order. The Contractor's current pay level is <strong>{{TAPayLevel}}</strong>.</p>
<p><br></p>
<p>Payment shall be made within 30 days of receipt of a proper invoice. The Contractor shall submit invoices to the Company after completion of each project.</p>
<p><br></p>
<h2><strong>§ 5 Obligations of the Contractor</strong></h2>
<ol>
<li>The Contractor shall perform all services with due care and professional competence.</li>
<li>The Contractor shall maintain valid documentation as required (police check, right to work, measles vaccination).</li>
<li>The Contractor shall notify the Company immediately of any inability to fulfil an accepted Work Order.</li>
<li>The Contractor shall maintain confidentiality regarding all Company business matters.</li>
</ol>
<p><br></p>
<h2><strong>§ 6 Data Protection</strong></h2>
<p>Both parties agree to comply with the applicable data protection regulations (GDPR/DSGVO). Personal data will only be processed as necessary for the fulfilment of this contract.</p>
<p><br></p>
<h2><strong>§ 7 Final Provisions</strong></h2>
<p>This contract is governed by the laws of the Federal Republic of Germany. Place of jurisdiction is Berlin.</p>
<p>Amendments to this contract must be made in writing.</p>`;

export function ContractTemplateEditor({ templates }: { templates: Template[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const router = useRouter();

  // Group by type, show latest version
  const byType = new Map<string, Template>();
  templates.forEach((t) => {
    if (!byType.has(t.type) || t.version > (byType.get(t.type)?.version || 0)) {
      byType.set(t.type, t);
    }
  });

  if (editing) {
    const template = byType.get(editing);
    return (
      <TemplateEditorFull
        type={editing}
        typeLabel={TEMPLATE_TYPES.find((t) => t.value === editing)?.label || editing}
        template={template}
        onClose={() => { setEditing(null); router.refresh(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {TEMPLATE_TYPES.map((tt) => {
        const template = byType.get(tt.value);
        return (
          <div key={tt.value} className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tt.label}</h3>
                {template ? (
                  <p className="mt-0.5 text-[13px] text-zinc-500">
                    v{template.version} — Updated {new Date(template.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[13px] text-zinc-400">No template yet — click to create</p>
                )}
              </div>
              <button
                onClick={() => setEditing(tt.value)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                {template ? "Edit" : "Create"}
              </button>
            </div>
            {template && (
              <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <div className="max-h-24 overflow-hidden text-xs text-zinc-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: template.body.substring(0, 400) + "..." }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Version History */}
      {templates.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Version History</h3>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t.title}</span>
                  <span className="ml-2 text-xs text-zinc-400">v{t.version}</span>
                </div>
                <span className="text-xs text-zinc-400">{new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditorFull({ type, typeLabel, template, onClose }: {
  type: string; typeLabel: string; template?: Template; onClose: () => void;
}) {
  const defaultBody = type === "framework_contract" ? DEFAULT_FRAMEWORK : template?.body || "<h1>Title</h1><p>Content...</p>";
  const [html, setHtml] = useState(template?.body || defaultBody);
  const [title, setTitle] = useState(template?.title || typeLabel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["blockquote", "clean"],
    ],
  }), []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/contracts/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, body: html, base_version: template?.version }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{typeLabel}</h2>
            <p className="text-xs text-zinc-400">{template ? `Editing v${template.version}` : "New template"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button onClick={() => setShowPreview(!showPreview)}
            className={`rounded-xl px-4 py-2 text-xs font-medium ${showPreview ? "bg-blue-600 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"}`}>
            {showPreview ? "Back to Editor" : "Preview"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
            {saving ? "Saving..." : template ? "Save New Version" : "Create Template"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Variables sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Variables</h3>
            <p className="text-[10px] text-zinc-400 mb-3">Click to copy, paste into editor</p>
            {["Teaching Artist", "Contract", "Company"].map((group) => (
              <div key={group} className="mb-3">
                <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">{group}</p>
                <div className="space-y-0.5">
                  {CONTRACT_VARIABLES.filter((t) => t.group === group).map((v) => (
                    <button key={v.tag} onClick={() => copyTag(v.tag)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-blue-50 active:bg-blue-100 dark:hover:bg-zinc-800">
                      <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {v.tag.replace(/\{\{|\}\}/g, "")}
                      </span>
                      <span className="text-zinc-500 truncate">{v.label}</span>
                      {copied === v.tag && <span className="text-[10px] text-green-600 ml-auto">Copied!</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Title */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-900 dark:text-zinc-50">Template Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100" />
          </div>
        </div>

        {/* Editor / Preview */}
        <div className="lg:col-span-4">
          <div className="contract-page mx-auto" style={{ maxWidth: 794, background: "white", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {showPreview ? (
              <div className="ql-snow">
                <div className="ql-editor" style={{ padding: "60px 60px", fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: fillVariables(html) }} />
              </div>
            ) : (
              <div className="contract-editor">
                <ReactQuill theme="snow" value={html} onChange={setHtml} modules={modules} />
              </div>
            )}

            {/* Signature area */}
            <div style={{ padding: "0 60px 60px", fontFamily: "Arial, sans-serif", fontSize: 13 }}>
              <div style={{ borderTop: "2px solid #1a1a1a", margin: "24px 0" }} />
              <div style={{ display: "flex", gap: 40 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ borderBottom: "1px solid #333", height: 60, marginBottom: 8, display: "flex", alignItems: "flex-end" }}>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>Signature</span>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1, borderBottom: "1px solid #333", height: 24 }}><span style={{ color: "#94a3b8", fontSize: 10 }}>Place</span></div>
                    <div style={{ flex: 1, borderBottom: "1px solid #333", height: 24 }}><span style={{ color: "#94a3b8", fontSize: 10 }}>Date</span></div>
                  </div>
                  <p style={{ fontWeight: "bold", marginTop: 8, fontSize: 12 }}>{showPreview ? SAMPLE_DATA.TAName : "{{TAName}}"}</p>
                  <p style={{ fontStyle: "italic", color: "#666", fontSize: 11 }}>Contractor</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: "bold", fontSize: 12 }}>Berlin, {showPreview ? SAMPLE_DATA.ContractDate : "{{ContractDate}}"}</p>
                  <div style={{ height: 60, marginBottom: 8 }} />
                  <p style={{ fontWeight: "bold", fontSize: 12 }}>C. Justin Beard</p>
                  <p style={{ fontSize: 11 }}>CEO, InterACT English gGmbH</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .contract-editor .ql-container { font-size: 13px; font-family: Arial, sans-serif; border: none !important; }
        .contract-editor .ql-editor { min-height: 800px; padding: 60px !important; line-height: 1.8; }
        .contract-editor .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e5e7eb !important; padding: 8px 16px; position: sticky; top: 0; z-index: 10; background: white; }
        .contract-page .ql-editor h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .contract-page .ql-editor h2 { font-size: 1.4em; font-weight: bold; margin: 0.5em 0; }
        .contract-page .ql-editor h3 { font-size: 1.15em; font-weight: bold; margin: 0.5em 0; }
        .contract-page .ql-editor ol, .contract-page .ql-editor ul { padding-left: 1.5em; }
        .contract-page .ql-editor blockquote { border-left: 4px solid #ccc; padding-left: 16px; color: #666; }
      `}</style>
    </div>
  );
}
