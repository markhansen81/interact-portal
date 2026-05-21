import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";

const REQUIRED_DOCS = [
  { type: "right_to_work", label: "Right to Work", desc: "Upload your passport, visa, or work permit" },
  { type: "police_check", label: "Police Check", desc: "Extended police check (erweitertes Fuhrungszeugnis)" },
  { type: "measles", label: "Measles Vaccination", desc: "Proof of measles vaccination or immunity" },
  { type: "first_aid", label: "First Aid", desc: "A valid first aid certificate" },
];

const FORM_TASKS = [
  {
    id: "personal",
    title: "Personal Details & Qualifications",
    desc: "Contact info, identity, education, and teaching experience",
    icon: "user",
    fields: ["first_name", "last_name", "phone", "date_of_birth", "nationality", "street", "city", "postal_code", "gender", "pronouns"],
  },
  {
    id: "payroll",
    title: "Payroll & Banking",
    desc: "Bank details and tax information for invoicing",
    icon: "briefcase",
    fields: ["iban", "bank_name", "tax_number"],
  },
  {
    id: "programs_logistics",
    title: "InterACT Programs & Logistics",
    desc: "Learn about our programs, homestays, dietary needs, and transport",
    icon: "star",
    fields: ["homestay_willing"],
    // Completion also requires all 29 programs answered — handled separately
  },
  {
    id: "school_profile",
    title: "TA School Profile",
    desc: "The fun stuff! Build the profile that schools and kids will see",
    icon: "sparkle",
    fields: ["bio", "superpower", "hometown_city", "hometown_country", "moved_to_germany", "favourite_food"],
  },
];

export default async function PortalDashboard() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("type, status")
    .eq("ta_id", profile.id);

  const docsByType = new Map((documents || []).map((d) => [d.type, d]));

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

  // Count program preferences answered
  const { count: programsAnswered } = await supabase
    .from("ta_program_preferences")
    .select("*", { count: "exact", head: true })
    .eq("ta_id", profile.id);

  const p = profile as Record<string, unknown>;
  const hasValue = (field: string) => p[field] !== null && p[field] !== undefined && p[field] !== "";
  const countFilled = (fields: string[]) => fields.filter(hasValue).length;
  const hasPhoto = !!p.photo_url;

  // Build task items
  type TaskItem = {
    id: string; title: string; desc: string; icon: string;
    done: boolean; href: string; filled?: number; total?: number;
  };

  const TOTAL_PROGRAMS = 29; // All programs across all categories

  const tasks: TaskItem[] = FORM_TASKS.map((t) => {
    if (t.id === "programs_logistics") {
      // Programs task: needs homestay + all 29 programs answered
      const homestayDone = hasValue("homestay_willing");
      const progCount = programsAnswered ?? 0;
      const filled = (homestayDone ? 1 : 0) + progCount;
      const total = 1 + TOTAL_PROGRAMS; // homestay + programs
      const done = homestayDone && progCount >= TOTAL_PROGRAMS;
      return {
        ...t,
        done,
        href: done ? "/portal/profile" : `/onboarding?task=${t.id}`,
        filled,
        total,
      };
    }
    const filled = countFilled(t.fields);
    const done = filled === t.fields.length;
    return {
      ...t,
      done,
      href: done ? "/portal/profile" : `/onboarding?task=${t.id}`,
      filled,
      total: t.fields.length,
    };
  });

  tasks.push({
    id: "photo",
    title: "Profile Photo",
    desc: "Upload a photo for your profile",
    icon: "camera",
    done: hasPhoto,
    href: hasPhoto ? "/portal/profile" : "/onboarding?task=photo_upload",
  });

  for (const doc of REQUIRED_DOCS) {
    const status = docsByType.get(doc.type)?.status;
    const done = status === "uploaded" || status === "verified";
    tasks.push({
      id: `doc_${doc.type}`,
      title: doc.label,
      desc: doc.desc,
      icon: "upload",
      done,
      href: done ? "/portal/documents" : `/onboarding?task=doc_${doc.type}`,
    });
  }

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track your onboarding progress and manage your work.
        </p>
      </div>

      {/* Onboarding Progress */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="px-7 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {allDone ? "Onboarding Complete" : "Onboarding Progress"}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {allDone
                  ? "You're all set! Your profile is complete."
                  : `${completedCount} of ${totalCount} tasks complete`}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-bold tabular-nums ${allDone ? "text-green-600" : "text-zinc-900 dark:text-zinc-50"}`}>
                {completedCount}/{totalCount}
              </span>
              <p className="text-xs text-zinc-400">tasks done</p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-2 rounded-full transition-all duration-700 ease-out ${allDone ? "bg-green-500" : "bg-green-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Task cards */}
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className={`flex items-center gap-4 px-7 py-5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  task.done ? "bg-green-50/30 dark:bg-green-900/5" : ""
                }`}
              >
                {/* Icon */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  task.done
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                }`}>
                  {task.done ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <TaskIcon type={task.icon} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${
                    task.done ? "text-green-700 dark:text-green-400" : "text-zinc-900 dark:text-zinc-50"
                  }`}>
                    {task.title}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-zinc-500">{task.desc}</p>
                  {/* Sub-progress bar for form tasks */}
                  {task.total && !task.done && (
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            task.filled! > 0 ? "bg-blue-400" : "bg-zinc-200 dark:bg-zinc-700"
                          }`}
                          style={{ width: `${Math.round((task.filled! / task.total) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium tabular-nums text-zinc-400">
                        {task.filled}/{task.total}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <svg className="h-5 w-5 shrink-0 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending Work Orders" value={pendingWOs ?? 0} href="/portal/work-orders" highlight={!!pendingWOs} />
        <StatCard label="Unread Messages" value={unreadMessages ?? 0} href="/portal/messages" highlight={!!unreadMessages} />
        <StatCard label="Pay Level" value={profile.pay_level} href="/portal/profile" />
        <StatCard label="Total Projects" value={profile.total_projects ?? 0} href="/portal/work-orders" />
      </div>

      {/* Training */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Training</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TrainingCard label="Online Onboarding" done={profile.training_online} />
          <TrainingCard label="Offline Foundation" done={profile.training_offline} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function TaskIcon({ type }: { type: string }) {
  const cls = "h-5 w-5";
  switch (type) {
    case "user":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>;
    case "briefcase":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>;
    case "star":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>;
    case "sparkle":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
    case "camera":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>;
    case "upload":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stat & Training Cards
// ---------------------------------------------------------------------------

function StatCard({ label, value, href, highlight }: {
  label: string; value: number; href: string; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition-all hover:shadow-sm ${
        highlight
          ? "border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-900/10"
          : "border-zinc-200/80 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="text-[13px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${
        highlight ? "text-amber-700 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-50"
      }`}>
        {value}
      </p>
    </Link>
  );
}

function TrainingCard({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        done
          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
      }`}>
        {done && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
        {done ? "Complete" : "Pending"}
      </span>
    </div>
  );
}
