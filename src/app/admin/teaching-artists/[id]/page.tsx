import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TAProfileEditor } from "@/components/admin/ta-profile-editor";
import { logAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]} ${y}`;
}
function fmtDateRange(start: string | null, end: string | null) {
  if (!start) return "—";
  if (!end || end === start) return fmtDate(start);
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  const ds = (s: string) => { const [,m,d] = s.split("-"); return `${parseInt(d)} ${MONTHS[parseInt(m)-1]}`; };
  if (sy === ey && sm === em) return `${parseInt(start.split("-")[2])}–${ds(end)} ${sy}`;
  if (sy === ey) return `${ds(start)} – ${ds(end)} ${ey}`;
  return `${ds(start)} ${sy} – ${ds(end)} ${ey}`;
}

function expiryColor(expiry: string | null) {
  if (!expiry) return "text-neutral-400";
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return "text-red-600 font-medium";
  if (days < 90) return "text-amber-600";
  return "text-neutral-600";
}

const DOC_LABELS: Record<string, string> = {
  visa: "Visa / Work Permit",
  passport: "Passport",
  right_to_work: "Work Permit (legacy)",
  police_check: "Police Check (Führungszeugnis)",
  measles: "Measles Vaccination",
  first_aid: "First Aid Certificate",
};

const DOC_STATUS: Record<string, string> = {
  uploaded: "bg-blue-50 text-blue-700",
  verified: "bg-green-50 text-green-700",
  expiring: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
  not_uploaded: "bg-neutral-100 text-neutral-400",
};

const WO_STATUS: Record<string, { bg: string; label: string }> = {
  signed:   { bg: "bg-green-100 text-green-700",   label: "Signed" },
  sent:     { bg: "bg-blue-100 text-blue-600",     label: "Sent" },
  draft:    { bg: "bg-neutral-100 text-neutral-400", label: "Draft" },
  declined: { bg: "bg-red-100 text-red-600",       label: "Declined" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-6 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs text-neutral-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-900">{value || <span className="text-neutral-300">—</span>}</dd>
    </div>
  );
}

function Bool({ val }: { val: boolean | null }) {
  if (val === null || val === undefined) return <span className="text-neutral-300">—</span>;
  return val
    ? <span className="text-green-600">Yes</span>
    : <span className="text-neutral-400">No</span>;
}

export default async function TAProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ta } = await supabase.from("profiles").select("*").eq("id", id).eq("role", "ta").single();
  if (!ta) notFound();

  const [{ data: docs }, { data: workOrders }, { data: prefCounts }] = await Promise.all([
    supabase.from("documents").select("type, status, expiry_date, uploaded_at, issue_date").eq("ta_id", id),
    supabase.from("work_orders").select("id, project_name, school, start_date, end_date, status, program_type").eq("ta_id", id).order("start_date", { ascending: false }),
    supabase.from("ta_program_preferences").select("ta_id").eq("ta_id", id),
  ]);

  const adminUser = await getCurrentUser();
  if (adminUser) logAudit({ userId: adminUser.id, action: "profile_viewed", targetId: id, targetType: "ta_profile" });

  const name = ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email;
  const allDocs = docs || [];
  const allWOs = workOrders || [];
  const prefCount = prefCounts?.length || 0;

  // Normalize: right_to_work satisfies both visa + passport for display
  const hasRTW = allDocs.some((d) => d.type === "right_to_work");
  const DOC_TYPES = ["visa", "passport", "police_check", "measles", "first_aid"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/teaching-artists" className="mt-1 text-sm text-neutral-400 hover:text-neutral-700">
          ← Back
        </Link>
        <div className="flex flex-1 items-center gap-5">
          {ta.photo_url ? (
            <img src={ta.photo_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-neutral-100" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-500">
              {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-neutral-900">{name}</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ta.is_active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                {ta.is_active ? "Active" : "Inactive"}
              </span>
              <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-white">
                Level {ta.pay_level}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-neutral-400">{ta.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact & Identity */}
          <Section title="Contact & Identity">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="First name" value={ta.first_name} />
              <Field label="Last name" value={ta.last_name} />
              <Field label="Preferred name" value={ta.preferred_name} />
              <Field label="Phone" value={ta.phone} />
              <Field label="Date of birth" value={fmtDate(ta.date_of_birth)} />
              <Field label="Nationality" value={ta.nationality} />
              <Field label="Gender" value={ta.gender} />
              <Field label="Pronouns" value={ta.pronouns} />
              <Field label="Ethnicity" value={ta.ethnicity} />
              <Field label="LGBTQIA+" value={ta.lgbtqia} />
              <Field label="Caretaker status" value={ta.caretaker_status} />
            </dl>
          </Section>

          {/* Address */}
          <Section title="Address">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Street" value={ta.street} wide />
              <Field label="City" value={ta.city} />
              <Field label="Postal code" value={ta.postal_code} />
              <Field label="Country" value={ta.country} />
              <Field label="Hometown" value={[ta.hometown_city, ta.hometown_country].filter(Boolean).join(", ")} />
              <Field label="In Germany since" value={ta.moved_to_germany_year?.toString()} />
            </dl>
          </Section>

          {/* School Profile */}
          <Section title="School Profile">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Bio" value={ta.bio} wide />
              <Field label="Superpower" value={ta.superpower} wide />
              <Field label="Art type" value={ta.art_type} />
              <Field label="Art profession" value={ta.art_profession} />
              <Field label="Where from" value={ta.where_from} />
              <Field label="Likes about Germany" value={ta.likes_germany} />
              <Field label="Favourite vacation spot" value={ta.vacation_spot} />
              <Field label="Great at" value={ta.great_at} />
              <Field label="Not great at" value={ta.not_great_at} />
              <Field label="Comic strip title" value={ta.comic_title} />
              <Field label="Famous last words" value={ta.famous_last_words} />
              <Field label="Favourite food" value={ta.favourite_food} />
              <Field label="Programs selected" value={`${prefCount} / 29`} />
            </dl>
          </Section>

          {/* Qualifications & Logistics */}
          <Section title="Qualifications & Logistics">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Education" value={ta.education_level} />
              <Field label="Certifications" value={ta.certifications} />
              <Field label="TEFL status" value={ta.tefl_status} />
              <Field label="German level" value={ta.german_level} />
              <Field label="German professional" value={<Bool val={ta.german_professional} />} />
              <Field label="Grades 1–4 exp." value={<Bool val={ta.exp_grades_1_4} />} />
              <Field label="Grades 5–7 exp." value={<Bool val={ta.exp_grades_5_7} />} />
              <Field label="Grades 8+ exp." value={<Bool val={ta.exp_grades_8_plus} />} />
              <Field label="Disability experience" value={<Bool val={ta.exp_disabilities} />} />
              {ta.exp_disabilities && <Field label="Disability types" value={(ta.exp_disability_types as string[] | null)?.join(", ")} />}
              <Field label="Dietary restrictions" value={ta.dietary_restrictions || (ta.dietary_options as string[] | null)?.join(", ")} />
              <Field label="Homestay willing" value={<Bool val={ta.homestay_willing} />} />
              <Field label="Lifeguard cert" value={ta.lifeguard_cert} />
              <Field label="Driver's licence" value={ta.drivers_licence} />
              <Field label="BahnCard" value={ta.bahncard} />
              {ta.bahncard && ta.bahncard !== "none" && <Field label="BahnCard expiry" value={fmtDate(ta.bahncard_expiry)} />}
              <Field label="Deutschlandticket" value={<Bool val={ta.deutschlandticket} />} />
            </dl>
          </Section>

          {/* Documents */}
          <Section title="Documents">
            <div className="space-y-3">
              {DOC_TYPES.map((type) => {
                const doc = allDocs.find((d) => d.type === type) ||
                  (hasRTW && (type === "visa" || type === "passport") ? allDocs.find((d) => d.type === "right_to_work") : null);
                const status = doc?.status || "not_uploaded";
                return (
                  <div key={type} className="flex items-center justify-between rounded-sm border border-neutral-100 bg-neutral-50 px-4 py-3">
                    <span className="text-sm font-medium text-neutral-700">{DOC_LABELS[type]}</span>
                    <div className="flex items-center gap-4">
                      {doc?.expiry_date && (
                        <span className={`text-xs ${expiryColor(doc.expiry_date)}`}>
                          Expires {fmtDate(doc.expiry_date)}
                        </span>
                      )}
                      {doc?.issue_date && (
                        <span className="text-xs text-neutral-400">Issued {fmtDate(doc.issue_date)}</span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DOC_STATUS[status] || DOC_STATUS.not_uploaded}`}>
                        {status === "not_uploaded" ? "Missing" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {hasRTW && !allDocs.some((d) => d.type === "visa") && (
                <p className="text-xs text-neutral-400 italic">* Showing legacy right-to-work document for Visa/Passport slots</p>
              )}
            </div>
          </Section>

          {/* Work Orders */}
          <Section title={`Work Orders (${allWOs.length})`}>
            {allWOs.length === 0 ? (
              <p className="text-sm text-neutral-400">No work orders yet.</p>
            ) : (
              <div className="overflow-hidden rounded-sm border border-neutral-100">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Project / School</th>
                      <th className="px-4 py-2 text-left">Program</th>
                      <th className="px-4 py-2 text-left">Dates</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {allWOs.map((wo) => {
                      const ws = WO_STATUS[wo.status] || WO_STATUS.draft;
                      return (
                        <tr key={wo.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-900">{wo.project_name || "—"}</p>
                            <p className="text-xs text-neutral-400">{wo.school || ""}</p>
                          </td>
                          <td className="px-4 py-3 text-neutral-500">{wo.program_type || "—"}</td>
                          <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{fmtDateRange(wo.start_date, wo.end_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ws.bg}`}>{ws.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Pay & Projects */}
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Pay Level</h3>
            <p className="mt-1 text-4xl font-bold text-neutral-900">Level {ta.pay_level}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-400">Qualifying projects</dt><dd className="text-neutral-900">{ta.qualifying_projects}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-400">Total projects</dt><dd className="text-neutral-900">{ta.total_projects}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-400">Camps</dt><dd className="text-neutral-900">{ta.total_camps ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-400">PD credits</dt><dd className="text-neutral-900">{ta.pd_workshop_credits}</dd></div>
            </dl>
          </div>

          {/* Training */}
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Training</h3>
            <TrainingRow label="Online Onboarding" done={ta.training_online} />
            <TrainingRow label="Offline Foundation" done={ta.training_offline} />
          </div>

          {/* Onboarding */}
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Onboarding</h3>
            <p className="mt-2 text-lg font-semibold capitalize text-neutral-900">
              {ta.onboarding_status?.replace(/_/g, " ") || "—"}
            </p>
          </div>

          {/* Payroll */}
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Payroll & Banking</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-neutral-400">IBAN</dt><dd className="text-neutral-900 font-mono text-xs break-all">{ta.iban || "—"}</dd></div>
              <div><dt className="text-xs text-neutral-400">BIC</dt><dd className="text-neutral-900">{ta.bic || "—"}</dd></div>
              <div><dt className="text-xs text-neutral-400">Bank</dt><dd className="text-neutral-900">{ta.bank_name || "—"}</dd></div>
              <div><dt className="text-xs text-neutral-400">Tax number</dt><dd className="text-neutral-900">{ta.tax_number || "—"}</dd></div>
              <div><dt className="text-xs text-neutral-400">VAT registered</dt><dd className="text-neutral-900">{ta.vat_registered ? `Yes — ${ta.vat_number || "no number"}` : "No"}</dd></div>
            </dl>
          </div>

          {/* Lanes & Planes */}
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Lanes & Planes</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-400">Synced</dt>
                <dd className={ta.lanes_planes_synced ? "text-green-600" : "text-neutral-400"}>{ta.lanes_planes_synced ? "Yes" : "No"}</dd>
              </div>
              {ta.lanes_planes_id && <div><dt className="text-xs text-neutral-400">L&P ID</dt><dd className="text-neutral-900 font-mono text-xs">{ta.lanes_planes_id}</dd></div>}
              {ta.lanes_planes_synced_at && <div><dt className="text-xs text-neutral-400">Last sync</dt><dd className="text-neutral-600 text-xs">{new Date(ta.lanes_planes_synced_at).toLocaleDateString()}</dd></div>}
            </dl>
          </div>

          {/* Account */}
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Account</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-neutral-400">Email</dt><dd className="text-neutral-900 break-all">{ta.email}</dd></div>
              <div><dt className="text-xs text-neutral-400">Status</dt><dd className={ta.is_active ? "text-green-600" : "text-neutral-500"}>{ta.is_active ? "Active" : "Inactive"}</dd></div>
              <div><dt className="text-xs text-neutral-400">Joined</dt><dd className="text-neutral-900">{new Date(ta.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
              {ta.gdpr_consent_at && <div><dt className="text-xs text-neutral-400">GDPR consent</dt><dd className="text-neutral-600 text-xs">{new Date(ta.gdpr_consent_at).toLocaleDateString()}</dd></div>}
            </dl>
          </div>

          {/* Edit */}
          <TAProfileEditor ta={ta as any} compact />
        </div>
      </div>
    </div>
  );
}

function TrainingRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-neutral-700">{label}</span>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${done ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
        {done ? "Complete" : "Not complete"}
      </span>
    </div>
  );
}
