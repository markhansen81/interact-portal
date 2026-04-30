"use client";

import { useState } from "react";
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
  { tag: "{{TeachingArtist}}", label: "TA Full Name", group: "TA" },
  { tag: "{{TeachingArtistEmail}}", label: "TA Email", group: "TA" },
  { tag: "{{ProjectID}}", label: "Project ID", group: "Project" },
  { tag: "{{Date}}", label: "Date Range", group: "Project" },
  { tag: "{{Days}}", label: "Number of Days", group: "Project" },
  { tag: "{{Name}}", label: "School/Organisation", group: "Project" },
  { tag: "{{Address}}", label: "School Address", group: "Project" },
  { tag: "{{State}}", label: "State/Bundesland", group: "Project" },
  { tag: "{{ProjectType}}", label: "Program Type", group: "Project" },
  { tag: "{{SpecialConditions}}", label: "Special Conditions", group: "Project" },
  { tag: "{{CoTaught}}", label: "Co taught / Not co taught", group: "Project" },
  { tag: "{{Grade}}", label: "Year / Grade", group: "Project" },
  { tag: "{{Accommodation}}", label: "Accommodation", group: "Project" },
  { tag: "{{Total}}", label: "Total Fee (€)", group: "Pay" },
  { tag: "{{DailyRate}}", label: "Daily Rate (€)", group: "Pay" },
  { tag: "{{PayLevel}}", label: "TA Pay Level", group: "Pay" },
  { tag: "{{SignByDate}}", label: "Sign-by Deadline", group: "Admin" },
  { tag: "{{CreatedDate}}", label: "Document Created Date", group: "Admin" },
  { tag: "{{CompanySignatory}}", label: "Company Signatory", group: "Company" },
];

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif;">

<div style="text-align: right; font-size: 12px; color: #666;">
InterACT English gGmbH<br/>
Planufer 92B, 10967 Berlin<br/>
Tel. 030 20339702<br/>
info@interactenglish.de<br/>
Geschäftsführer:<br/>
Mark William Hansen & Charles Justin Beard<br/>
Handelsregister - Amtsgericht Charlottenburg<br/>
HRB 188932 B
</div>

<p style="text-align: right; color: #16a34a; font-weight: bold;">Project ID (for office use): {{ProjectID}}</p>

<h1 style="font-size: 32px; font-weight: 900; margin-top: 32px;">WORK ORDER</h1>

<p>By and between</p>
<p><strong>InterACT English gGmbH</strong><br/>
(referred to in the following as "the Company")</p>

<p>and: <strong>{{TeachingArtist}}</strong><br/>
(referred to in the following as "the Contractor")</p>

<h3>Project Details (Location, date, project type, specific project remuneration)</h3>
<p>The Contractor shall be teaching on the following project (Project details are subject to change):</p>

<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 4px 0; width: 250px;"><strong>Date of project / Time period:</strong></td><td>{{Date}}, {{Days}}</td></tr>
<tr><td style="padding: 4px 0;"><strong>Organisation (workplace):</strong></td><td>{{Name}}</td></tr>
<tr><td style="padding: 4px 0;"></td><td>{{Address}}</td></tr>
<tr><td style="padding: 4px 0;"></td><td>{{State}}</td></tr>
<tr><td style="padding: 4px 0;"><strong>Project type:</strong></td><td>{{ProjectType}}</td></tr>
<tr><td style="padding: 4px 0;"><strong>Special conditions:</strong></td><td><em>{{SpecialConditions}}</em></td></tr>
<tr><td style="padding: 4px 0;"><strong>Co taught / Not co taught:</strong></td><td>{{CoTaught}}</td></tr>
<tr><td style="padding: 4px 0;"><strong>Grade:</strong></td><td>{{Grade}}</td></tr>
<tr><td style="padding: 4px 0;"><strong>Accommodation:</strong></td><td>{{Accommodation}}</td></tr>
</table>

<h3 style="margin-top: 24px;">IMPORTANT: Before signing this work order please do and consider the following:</h3>
<ol>
<li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. This has the obvious reason that we must ensure that teaching staff arrives on time to run the program. Same day travel may be organised by InterACT in some exceptions, but it remains in the companies judgment if this is warranted/possible or not. Travel the day before is included in the flat-fee paid for every program. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
<li>Check the address of the school/hostel you will travel to. Some projects require longer travel time. Please consider this before signing the work order.</li>
<li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food, or a supermarket can be difficult in rural locations. Please be prepared before you travel.</strong> This might mean packing some food, or bringing essentials.</li>
<li>Please CAREFULLY read the project notes prepared for you in the project folder the week before traveling. These notes have critical information that impacts the project and your travel plans. If anything is unclear contact the project coordinator during working hours (M-F) and we can answer your questions.</li>
<li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance of your project.</strong> We always endeavour to provide accurate information but mistakes do happen. You can prevent complications and frustration by double checking all details of this project before you travel. Details can be found in your project notes.</li>
</ol>

<p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share to why you are declining the work order.</p>
<p>We may have open positions available and would love to find the right project for you.</p>
<p>Reasons include: needing a project closer to your hometown, that you can only work certain days, or that you are looking for a certain type of project for the week. In some cases we may be able to provide alternative projects in this period that meet your requirements.</p>
<p>We thank you for all of your input and wish you a successful projects!</p>

<hr style="margin: 32px 0;" />

<p>With this signature I accept the Work Order:</p>

<div style="margin-top: 40px;">
<div style="display: inline-block; width: 45%;">
<div style="border-bottom: 1px solid #333; height: 60px;"></div>
<p><strong>{{TeachingArtist}}</strong><br/><em>Teaching Artist (Contractor)</em></p>
</div>
<div style="display: inline-block; width: 45%; margin-left: 5%;">
<p>Berlin, {{CreatedDate}}</p>
<p><strong>C. Justin Beard</strong><br/>Chief Executive Officer<br/>InterACT English gGmbH</p>
</div>
</div>

<hr style="margin: 32px 0;" />

<p style="font-size: 11px; color: #999;">
Office address: Gneisenaustr. 64, 10961 Berlin, Germany<br/>
Billing address: Planufer 92B, 10967 Berlin, Germany<br/>
Managing Directors: Mark William Hansen & Charles Justin Beard<br/>
Handelsregister - Amtsgericht Charlottenburg - HRB 188932 B
</p>

</div>`;

export function WorkOrderTemplateEditor({
  template,
}: {
  template: Template | null;
}) {
  const [html, setHtml] = useState(template?.body_html || DEFAULT_TEMPLATE);
  const [conditionsHtml, setConditionsHtml] = useState(template?.conditions_html || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/work-orders/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body_html: html,
        conditions_html: conditionsHtml,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  function insertTag(tag: string) {
    setHtml(html + tag);
  }

  // Replace tags with sample data for preview
  function renderPreview() {
    return html
      .replace(/\{\{TeachingArtist\}\}/g, "Jane Smith")
      .replace(/\{\{TeachingArtistEmail\}\}/g, "jane@example.com")
      .replace(/\{\{ProjectID\}\}/g, "WO-ABC123")
      .replace(/\{\{Date\}\}/g, "2026-05-18 — 2026-05-22")
      .replace(/\{\{Days\}\}/g, "5 days")
      .replace(/\{\{Name\}\}/g, "Realschule Maria Stern Augsburg")
      .replace(/\{\{Address\}\}/g, "Schulstraße 12, 86150 Augsburg")
      .replace(/\{\{State\}\}/g, "BAYERN")
      .replace(/\{\{ProjectType\}\}/g, "Native Speaker Week")
      .replace(/\{\{SpecialConditions\}\}/g, "None")
      .replace(/\{\{CoTaught\}\}/g, "Not co taught")
      .replace(/\{\{Grade\}\}/g, "8. Kl.")
      .replace(/\{\{Accommodation\}\}/g, "Hotel Ibis, single room")
      .replace(/\{\{Total\}\}/g, "€560.00")
      .replace(/\{\{DailyRate\}\}/g, "€112.00")
      .replace(/\{\{PayLevel\}\}/g, "Level 5")
      .replace(/\{\{SignByDate\}\}/g, "2026-05-10")
      .replace(/\{\{CreatedDate\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{CompanySignatory\}\}/g, "C. Justin Beard");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Variable Tags Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">Variable Tags</h3>
          <p className="text-xs text-zinc-400 mb-3">Click to insert at cursor position</p>
          {["Project", "TA", "Pay", "Admin", "Company"].map((group) => (
            <div key={group} className="mb-3">
              <p className="text-[10px] font-medium uppercase text-zinc-400 mb-1">{group}</p>
              <div className="space-y-1">
                {VARIABLE_TAGS.filter((t) => t.group === group).map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => insertTag(tag.tag)}
                    className="block w-full rounded px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <span className="font-mono text-blue-600 dark:text-blue-400">{tag.tag}</span>
                    <br />
                    <span className="text-zinc-400">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/admin/work-orders"
          className="block text-center text-sm text-zinc-500 hover:text-zinc-700"
        >
          &larr; Back to Work Orders
        </Link>
      </div>

      {/* Editor / Preview */}
      <div className="lg:col-span-3 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setView("edit")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                view === "edit"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              Edit HTML
            </button>
            <button
              onClick={() => setView("preview")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                view === "preview"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              Preview
            </button>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            {template && (
              <span className="text-xs text-zinc-400">v{template.version}</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        {view === "edit" ? (
          <div className="space-y-4">
            {/* Main body editor */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-500">Work Order Body</span>
              </div>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full p-4 font-mono text-xs text-zinc-800 dark:text-zinc-200 bg-transparent border-none outline-none resize-y"
                rows={35}
                spellCheck={false}
              />
            </div>

            {/* Conditions editor */}
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <span className="text-xs font-medium text-zinc-500">Work Order Conditions (§1-§6) — optional separate section</span>
              </div>
              <textarea
                value={conditionsHtml}
                onChange={(e) => setConditionsHtml(e.target.value)}
                className="w-full p-4 font-mono text-xs text-zinc-800 dark:text-zinc-200 bg-transparent border-none outline-none resize-y"
                rows={15}
                spellCheck={false}
                placeholder="Leave empty to use the conditions from the body. Or paste the bilingual §1-§6 HTML here to keep it separate."
              />
            </div>
          </div>
        ) : (
          /* Preview with sample data */
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto max-w-3xl">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
              {conditionsHtml && (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert mt-8 pt-8 border-t"
                  dangerouslySetInnerHTML={{ __html: conditionsHtml }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
