import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TemplatesPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  // Get latest versions
  const { data: woTemplate } = await supabase
    .from("work_order_templates")
    .select("id, name, version, updated_at")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const { data: contractTemplates } = await supabase
    .from("contract_templates")
    .select("id, type, title, version, created_at")
    .order("type")
    .order("version", { ascending: false });

  // Get unique latest contract templates by type
  const contractByType = new Map<string, { title: string; version: number; created_at: string }>();
  (contractTemplates || []).forEach((t) => {
    if (!contractByType.has(t.type)) {
      contractByType.set(t.type, t);
    }
  });

  const { data: formContent } = await supabase
    .from("form_content")
    .select("step_id", { count: "exact", head: false })
    .eq("form_id", "programs");
  const programEdits = new Set((formContent || []).map((c) => c.step_id)).size;

  const templates = [
    {
      title: "Work Order Template",
      description: "The template sent to TAs when assigning projects. Includes variable substitution for TA details, project info, and pay.",
      href: "/admin/work-orders/template",
      version: woTemplate ? `v${woTemplate.version}` : null,
      updated: woTemplate?.updated_at,
      icon: "file-text",
    },
    {
      title: "Contract Templates",
      description: "Framework contracts, democratic values declarations, police check self-declarations, and photo release forms.",
      href: "/admin/contracts/templates",
      version: contractByType.size > 0 ? `${contractByType.size} templates` : null,
      updated: contractTemplates?.[0]?.created_at,
      icon: "pen-tool",
      subtypes: [
        { label: "Framework Contract", done: contractByType.has("framework_contract") },
        { label: "Democratic Values", done: contractByType.has("democratic_values") },
        { label: "Police Check Self-Declaration", done: contractByType.has("self_declaration_police") },
        { label: "Photo Release", done: contractByType.has("photo_release") },
      ],
    },
    {
      title: "Program Onboarding Content",
      description: "Edit the descriptions, images, and text TAs see when going through the programs onboarding flow.",
      href: "/admin/forms/programs",
      version: programEdits > 0 ? `${programEdits} programs edited` : null,
      icon: "star",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Templates & Content
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage document templates, contract forms, and onboarding content.
        </p>
      </div>

      <div className="space-y-4">
        {templates.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start gap-5 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <TemplateIcon type={t.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t.title}</h3>
                    <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed">{t.description}</p>
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-zinc-300 mt-0.5 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>

                {/* Subtypes (for contracts) */}
                {"subtypes" in t && t.subtypes && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.subtypes.map((st) => (
                      <span key={st.label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        st.done
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                      }`}>
                        {st.done && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                        {st.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                  {t.version && <span className="font-medium">{t.version}</span>}
                  {t.updated && (
                    <span>Updated {new Date(t.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TemplateIcon({ type }: { type: string }) {
  const cls = "h-5 w-5";
  switch (type) {
    case "file-text":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    case "pen-tool":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
    case "star":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>;
    default:
      return null;
  }
}
