import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const REQUIRED_DOCS = [
  { type: "right_to_work", label: "Work Permit / Passport / Visa", description: "Upload your right to work document" },
  { type: "police_check", label: "Extended Police Check (Führungszeugnis)", description: "Valid for 2 years from issue date" },
  { type: "measles", label: "Measles Vaccination Proof", description: "Upload vaccination certificate" },
  { type: "first_aid", label: "First Aid Certificate", description: "Optional but recommended" },
];

export default async function DocumentsPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("ta_id", profile.id);

  const docsByType = new Map((documents || []).map((d) => [d.type, d]));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Documents
      </h2>
      <div className="space-y-4">
        {REQUIRED_DOCS.map((doc) => {
          const existing = docsByType.get(doc.type);
          const status = existing?.status || "not_uploaded";

          return (
            <div
              key={doc.type}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {doc.label}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">{doc.description}</p>
                {existing?.expiry_date && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Expires: {existing.expiry_date}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={status} />
                <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
                  {status === "not_uploaded" ? "Upload" : "Re-upload"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contracts to sign */}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 pt-4">
        Contracts & Declarations
      </h3>
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">
          Contracts and declarations sent by InterACT will appear here for you to sign.
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_uploaded: "bg-zinc-100 text-zinc-500",
    uploaded: "bg-blue-100 text-blue-700",
    verified: "bg-green-100 text-green-700",
    expiring: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    not_uploaded: "Not uploaded",
    uploaded: "Uploaded",
    verified: "Verified",
    expiring: "Expiring soon",
    expired: "Expired",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.not_uploaded}`}>
      {labels[status] || status}
    </span>
  );
}
