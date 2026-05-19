import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";

const REQUIRED_DOCS = [
  { type: "right_to_work", label: "Right to Work" },
  { type: "police_check", label: "Police Check" },
  { type: "measles", label: "Measles Vaccination" },
  { type: "first_aid", label: "First Aid" },
];


export default async function PortalDashboard() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  // Get documents
  const { data: documents } = await supabase
    .from("documents")
    .select("type, status")
    .eq("ta_id", profile.id);

  const docsByType = new Map((documents || []).map((d) => [d.type, d]));

  // Get counts
  const { count: pendingWOs } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", profile.id)
    .eq("status", "sent");

  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", profile.id)
    .is("read_at", null);

  // Calculate onboarding progress by checking actual data
  const p = profile as Record<string, unknown>;
  const hasValue = (field: string) => p[field] !== null && p[field] !== undefined && p[field] !== "";

  const personalDone = hasValue("first_name") && hasValue("last_name") && hasValue("phone")
    && hasValue("date_of_birth") && hasValue("nationality") && hasValue("street")
    && hasValue("city") && hasValue("postal_code") && hasValue("gender") && hasValue("pronouns");
  const payrollDone = hasValue("iban") && hasValue("bank_name") && hasValue("tax_number");
  const programsDone = hasValue("homestay_willing");
  const schoolDone = hasValue("bio") && hasValue("superpower") && hasValue("hometown_city")
    && hasValue("hometown_country") && hasValue("moved_to_germany") && hasValue("favourite_food");
  const hasPhoto = !!p.photo_url;

  // Sub-progress: count filled vs required fields per section
  const personalFields = ["first_name", "last_name", "phone", "date_of_birth", "nationality", "street", "city", "postal_code", "gender", "pronouns"];
  const payrollFields = ["iban", "bank_name", "tax_number"];
  const programsFields = ["homestay_willing"];
  const schoolFields = ["bio", "superpower", "hometown_city", "hometown_country", "moved_to_germany", "favourite_food"];

  const countFilled = (fields: string[]) => fields.filter(hasValue).length;

  const todoItems: { label: string; done: boolean; href: string; filled?: number; total?: number }[] = [
    { label: "Complete personal details & qualifications", done: personalDone, href: "/portal/profile", filled: countFilled(personalFields), total: personalFields.length },
    { label: "Add payroll & banking info", done: payrollDone, href: "/portal/profile", filled: countFilled(payrollFields), total: payrollFields.length },
    { label: "Select InterACT programs & logistics", done: programsDone, href: "/portal/profile", filled: countFilled(programsFields), total: programsFields.length },
    { label: "Build your TA school profile", done: schoolDone, href: "/portal/profile", filled: countFilled(schoolFields), total: schoolFields.length },
    { label: "Add a profile photo", done: hasPhoto, href: "/portal/profile" },
  ];

  // Documents
  for (const doc of REQUIRED_DOCS) {
    const status = docsByType.get(doc.type)?.status;
    const done = status === "uploaded" || status === "verified";
    todoItems.push({ label: `Upload ${doc.label}`, done, href: "/portal/documents" });
  }

  const completedCount = todoItems.filter((t) => t.done).length;
  const totalCount = todoItems.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        My Dashboard
      </h2>

      {/* Onboarding Progress */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {allDone ? "Onboarding Complete" : "Onboarding Progress"}
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              {allDone
                ? "You're all set! Your profile is complete."
                : `${completedCount} of ${totalCount} tasks complete`}
            </p>
          </div>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{progress}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Individual tasks */}
        {!allDone && (
          <div className="mt-5 space-y-2">
            {todoItems.filter((t) => !t.done).map((item) => {
              const subPct = item.total ? Math.round((item.filled! / item.total) * 100) : 0;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300 dark:border-zinc-600">
                    <span className="h-2 w-2 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.label}</span>
                    {item.total && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-1.5 rounded-full transition-all ${subPct === 100 ? "bg-green-500" : subPct > 0 ? "bg-blue-500" : "bg-zinc-300"}`}
                            style={{ width: `${subPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">{item.filled}/{item.total}</span>
                      </div>
                    )}
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}

        {/* Completed tasks (collapsed) */}
        {completedCount > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-zinc-400 mb-2">{completedCount} completed</p>
            <div className="space-y-1">
              {todoItems.filter((t) => t.done).map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg className="h-3 w-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="text-xs text-zinc-400 line-through">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Work Orders" value={pendingWOs ?? 0} href="/portal/work-orders" highlight={!!pendingWOs} />
        <StatCard label="Unread Messages" value={unreadMessages ?? 0} href="/portal/messages" highlight={!!unreadMessages} />
        <StatCard label="Pay Level" value={profile.pay_level} href="/portal/profile" />
        <StatCard label="Projects" value={profile.total_projects ?? 0} href="/portal/work-orders" />
      </div>

      {/* Training Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrainingCard label="Online Onboarding" done={profile.training_online} />
        <TrainingCard label="Offline Foundation" done={profile.training_offline} />
      </div>
    </div>
  );
}

function StatCard({ label, value, href, highlight }: {
  label: string; value: number; href: string; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-6 transition-colors hover:border-zinc-300 ${
        highlight
          ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-900/10"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
    </Link>
  );
}

function TrainingCard({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          done
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
        }`}>
          {done ? "Complete" : "Not complete"}
        </span>
      </div>
    </div>
  );
}
