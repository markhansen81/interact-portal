import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TAProfileEditor } from "@/components/admin/ta-profile-editor";

export default async function TAProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ta } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "ta")
    .single();

  if (!ta) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/teaching-artists"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          &larr; Back
        </Link>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {ta.first_name && ta.last_name
            ? `${ta.first_name} ${ta.last_name}`
            : ta.email}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Profile info */}
        <div className="lg:col-span-2 space-y-6">
          <TAProfileEditor ta={ta} />
        </div>

        {/* Right column - Status & quick info */}
        <div className="space-y-6">
          {/* Pay Level */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium text-zinc-500">Pay Level</h3>
            <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Level {ta.pay_level}
            </p>
            <div className="mt-3 space-y-1 text-sm text-zinc-500">
              <p>Qualifying projects: {ta.qualifying_projects}</p>
              <p>Total projects: {ta.total_projects}</p>
              <p>PD credits: {ta.pd_workshop_credits}</p>
            </div>
          </div>

          {/* Training Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium text-zinc-500">Training</h3>
            <div className="mt-3 space-y-3">
              <TrainingRow label="Online Onboarding" done={ta.training_online} />
              <TrainingRow label="Offline Foundation" done={ta.training_offline} />
            </div>
          </div>

          {/* Onboarding Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium text-zinc-500">Onboarding</h3>
            <p className="mt-2 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
              {ta.onboarding_status?.replace("_", " ")}
            </p>
          </div>

          {/* Account Info */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-medium text-zinc-500">Account</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-zinc-500">
                Email: <span className="text-zinc-900 dark:text-zinc-50">{ta.email}</span>
              </p>
              <p className="text-zinc-500">
                Status:{" "}
                <span className={ta.is_active ? "text-green-600" : "text-red-600"}>
                  {ta.is_active ? "Active" : "Inactive"}
                </span>
              </p>
              <p className="text-zinc-500">
                Joined:{" "}
                <span className="text-zinc-900 dark:text-zinc-50">
                  {new Date(ta.created_at).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          done
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
        }`}
      >
        {done ? "Complete" : "Not complete"}
      </span>
    </div>
  );
}
