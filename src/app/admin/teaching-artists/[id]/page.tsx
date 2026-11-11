import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TAProfileEditor } from "@/components/admin/ta-profile-editor";
import { TALevelEditor } from "@/components/admin/ta-level-editor";
import { GenerateDocsButton } from "@/components/admin/generate-docs-button";
import { TrainingToggle } from "@/components/admin/training-toggle";
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

const DOC_BORDER: Record<string, string> = {
  verified: "border-l-green-400",
  expiring: "border-l-amber-400",
  expired: "border-l-red-400",
  uploaded: "border-l-blue-400",
  not_uploaded: "border-l-neutral-200",
};

const WO_STATUS: Record<string, { bg: string; label: string }> = {
  signed:   { bg: "bg-green-100 text-green-700",   label: "Signed" },
  sent:     { bg: "bg-blue-100 text-blue-600",     label: "Sent" },
  draft:    { bg: "bg-neutral-100 text-neutral-400", label: "Draft" },
  declined: { bg: "bg-red-100 text-red-600",       label: "Declined" },
};

/** Section card with small-caps header strip */
function Section({ title, children, headerRight }: { title: string; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{title}</span>
        {headerRight}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Single inline field row — label col, value col */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-baseline py-2 px-6 border-b border-neutral-50 last:border-b-0">
      <span className="text-xs text-neutral-400 shrink-0">{label}</span>
      <span className="text-sm text-neutral-900">{children}</span>
    </div>
  );
}

/** Wide field — label above, value below, full width */
function WideField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-6 py-3 border-b border-neutral-50 last:border-b-0">
      <p className="text-xs text-neutral-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-neutral-900 leading-relaxed">{value || <span className="text-neutral-300 italic">—</span>}</p>
    </div>
  );
}

function Empty() {
  return <span className="text-neutral-300 text-sm italic">—</span>;
}

function Bool({ val }: { val: boolean | null }) {
  if (val === null || val === undefined) return <Empty />;
  return val
    ? <span className="text-green-600 font-medium">Yes</span>
    : <span className="text-neutral-400">No</span>;
}

/** Right-column card */
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default async function TAProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ta } = await supabase.from("profiles").select("*").eq("id", id).eq("role", "ta").single();
  if (!ta) notFound();

  const [{ data: docs }, { data: workOrders }, { data: prefCounts }] = await Promise.all([
    supabase.from("documents").select("type, status, expiry_date, uploaded_at, issue_date").eq("ta_id", id),
    supabase.from("work_orders").select("id, project_name, school, start_date, end_date, status, program_type, project_id").eq("ta_id", id).order("start_date", { ascending: false }),
    supabase.from("ta_program_preferences").select("ta_id").eq("ta_id", id),
  ]);

  // Fetch invoice history for level reconciliation
  const { data: invoiceHistory } = await supabase
    .from("ta_invoice_history")
    .select("id, invoice_date, project_name, school, days, level_invoiced, pdf_url, confidence, notes")
    .eq("ta_id", id)
    .gte("days", 3)
    .order("invoice_date", { ascending: true });

  // Fetch all projects this TA is linked to (via work_orders.project_id OR project_tas)
  const woProjectIds = (workOrders || []).map((wo) => wo.project_id).filter(Boolean) as string[];
  const { data: projectTasRows } = await supabase
    .from("project_tas")
    .select("project_id")
    .eq("ta_id", id);
  const taProjectIds = (projectTasRows || []).map((r) => r.project_id).filter(Boolean) as string[];
  const allProjectIds = [...new Set([...woProjectIds, ...taProjectIds])];

  const { data: profileDocs } = allProjectIds.length > 0
    ? await supabase
        .from("project_documents")
        .select("id, name, content, doc_type, created_at, project_id")
        .in("project_id", allProjectIds)
        .or(`name.ilike.TA Profile \u2014 ${ta.first_name}%,name.ilike.Homestay Profile \u2014 ${ta.first_name}%`)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch master TA profile docs (stored on TA, not in project folders)
  const { data: taProfileDocs } = await supabase
    .from("ta_profile_docs")
    .select("school_html, homestay_html, generated_at")
    .eq("ta_id", id)
    .single();

  const adminUser = await getCurrentUser();
  if (adminUser) logAudit({ userId: adminUser.id, action: "profile_viewed", targetId: id, targetType: "ta_profile" });

  const name = ta.first_name && ta.last_name ? `${ta.first_name} ${ta.last_name}` : ta.email;

  // Determine what's missing for doc generation
  const docReadyChecks = [
    { field: "First name", ok: !!ta.first_name },
    { field: "Last name", ok: !!ta.last_name },
    { field: "Photo", ok: !!ta.photo_url },
    { field: "Bio", ok: !!ta.bio },
  ];
  const missingForDocs = docReadyChecks.filter((c) => !c.ok).map((c) => c.field);
  const docsReady = missingForDocs.length === 0;
  const allDocs = docs || [];
  const allWOs = workOrders || [];
  const prefCount = prefCounts?.length || 0;

  // Normalize: right_to_work satisfies both visa + passport for display
  const hasRTW = allDocs.some((d) => d.type === "right_to_work");
  const DOC_TYPES = ["visa", "passport", "police_check", "measles", "first_aid"];

  return (
    <div className="space-y-6 pb-16">

      {/* ── BACK NAV ── */}
      <div>
        <Link
          href="/admin/teaching-artists"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Teaching Artists
        </Link>
      </div>

      {/* ── HERO HEADER ── */}
      <div className="w-full rounded-xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200 shadow-sm px-8 py-7">
        <div className="flex items-center gap-6">
          {ta.photo_url ? (
            <img
              src={ta.photo_url}
              alt=""
              className="h-20 w-20 rounded-full object-cover ring-2 ring-white ring-offset-2 ring-offset-neutral-100 shadow-sm"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-200 text-2xl font-bold text-neutral-500 ring-2 ring-white ring-offset-2 ring-offset-neutral-100 shadow-sm">
              {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">{name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  ta.is_active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {ta.is_active ? "Active" : "Inactive"}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ta.pay_level ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                {ta.pay_level ? `Level ${ta.pay_level}` : "Level TBC"}
              </span>
              {ta.onboarding_status && (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 capitalize">
                  {ta.onboarding_status.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-400">{ta.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact & Identity */}
          <Section title="Contact & Identity">
            <FieldRow label="First name">{ta.first_name || <Empty />}</FieldRow>
            <FieldRow label="Last name">{ta.last_name || <Empty />}</FieldRow>
            <FieldRow label="Preferred name">{ta.preferred_name || <Empty />}</FieldRow>
            <FieldRow label="Phone">{ta.phone || <Empty />}</FieldRow>
            <FieldRow label="Date of birth">{fmtDate(ta.date_of_birth)}</FieldRow>
            <FieldRow label="Nationality">{ta.nationality || <Empty />}</FieldRow>
            <FieldRow label="Gender">{ta.gender || <Empty />}</FieldRow>
            <FieldRow label="Pronouns">{ta.pronouns || <Empty />}</FieldRow>
            <FieldRow label="Ethnicity">{ta.ethnicity || <Empty />}</FieldRow>
            <FieldRow label="LGBTQIA+">{ta.lgbtqia || <Empty />}</FieldRow>
            <FieldRow label="Caretaker status">{ta.caretaker_status || <Empty />}</FieldRow>
          </Section>

          {/* Address */}
          <Section title="Address">
            <FieldRow label="Street">{ta.street || <Empty />}</FieldRow>
            <FieldRow label="City">{ta.city || <Empty />}</FieldRow>
            <FieldRow label="Postal code">{ta.postal_code || <Empty />}</FieldRow>
            <FieldRow label="Country">{ta.country || <Empty />}</FieldRow>
            <FieldRow label="Hometown">
              {[ta.hometown_city, ta.hometown_country].filter(Boolean).join(", ") || <Empty />}
            </FieldRow>
            <FieldRow label="In Germany since">
              {ta.moved_to_germany_year?.toString() || <Empty />}
            </FieldRow>
          </Section>

          {/* School Profile */}
          <Section
            title="School Profile"
            headerRight={
              ta.school_photo_url ? (
                <img
                  src={ta.school_photo_url}
                  alt="School photo"
                  className="h-8 w-8 rounded-md object-cover ring-1 ring-neutral-200"
                />
              ) : undefined
            }
          >
            <WideField label="Bio" value={ta.bio} />
            <WideField label="Superpower" value={ta.superpower} />
            <FieldRow label="Art type">{ta.art_type || <Empty />}</FieldRow>
            <FieldRow label="Art profession">{ta.art_profession || <Empty />}</FieldRow>
            <FieldRow label="Where from">{ta.where_from || <Empty />}</FieldRow>
            <FieldRow label="Likes about Germany">{ta.likes_germany || <Empty />}</FieldRow>
            <FieldRow label="Favourite vacation">{ta.vacation_spot || <Empty />}</FieldRow>
            <FieldRow label="Great at">{ta.great_at || <Empty />}</FieldRow>
            <FieldRow label="Not great at">{ta.not_great_at || <Empty />}</FieldRow>
            <FieldRow label="Comic strip title">{ta.comic_title || <Empty />}</FieldRow>
            <FieldRow label="Famous last words">{ta.famous_last_words || <Empty />}</FieldRow>
            <FieldRow label="Favourite food">{ta.favourite_food || <Empty />}</FieldRow>
            <FieldRow label="Programs selected">{`${prefCount} / 29`}</FieldRow>
          </Section>

          {/* Qualifications & Logistics */}
          <Section title="Qualifications & Logistics">
            <FieldRow label="Education">{ta.education_level || <Empty />}</FieldRow>
            <FieldRow label="Certifications">{ta.certifications || <Empty />}</FieldRow>
            <FieldRow label="TEFL status">{ta.tefl_status || <Empty />}</FieldRow>
            <FieldRow label="German level">{ta.german_level || <Empty />}</FieldRow>
            <FieldRow label="German professional"><Bool val={ta.german_professional} /></FieldRow>
            <FieldRow label="Grades 1–4 exp."><Bool val={ta.exp_grades_1_4} /></FieldRow>
            <FieldRow label="Grades 5–7 exp."><Bool val={ta.exp_grades_5_7} /></FieldRow>
            <FieldRow label="Grades 8+ exp."><Bool val={ta.exp_grades_8_plus} /></FieldRow>
            <FieldRow label="Disability experience"><Bool val={ta.exp_disabilities} /></FieldRow>
            {ta.exp_disabilities && (
              <FieldRow label="Disability types">
                {(ta.exp_disability_types as string[] | null)?.join(", ") || <Empty />}
              </FieldRow>
            )}
            <FieldRow label="Dietary restrictions">
              {ta.dietary_restrictions || (ta.dietary_options as string[] | null)?.join(", ") || <Empty />}
            </FieldRow>
            <FieldRow label="Homestay willing"><Bool val={ta.homestay_willing} /></FieldRow>
            <FieldRow label="Lifeguard cert">{ta.lifeguard_cert || <Empty />}</FieldRow>
            <FieldRow label="Driver's licence">{ta.drivers_licence || <Empty />}</FieldRow>
            <FieldRow label="BahnCard">{ta.bahncard || <Empty />}</FieldRow>
            {ta.bahncard && ta.bahncard !== "none" && (
              <FieldRow label="BahnCard expiry">{fmtDate(ta.bahncard_expiry)}</FieldRow>
            )}
            <FieldRow label="Deutschlandticket"><Bool val={ta.deutschlandticket} /></FieldRow>
          </Section>

          {/* Documents */}
          <Section title="Documents">
            <div className="divide-y divide-neutral-50">
              {DOC_TYPES.map((type) => {
                const doc = allDocs.find((d) => d.type === type) ||
                  (hasRTW && (type === "visa" || type === "passport") ? allDocs.find((d) => d.type === "right_to_work") : null);
                const status = doc?.status || "not_uploaded";
                const borderColor = DOC_BORDER[status] || DOC_BORDER.not_uploaded;
                return (
                  <div
                    key={type}
                    className={`flex items-center justify-between px-6 py-3.5 border-l-[3px] ${borderColor}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{DOC_LABELS[type]}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {doc?.expiry_date && (
                          <span className={`text-xs ${expiryColor(doc.expiry_date)}`}>
                            Expires {fmtDate(doc.expiry_date)}
                          </span>
                        )}
                        {doc?.issue_date && (
                          <span className="text-xs text-neutral-400">Issued {fmtDate(doc.issue_date)}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        DOC_STATUS[status] || DOC_STATUS.not_uploaded
                      }`}
                    >
                      {status === "not_uploaded" ? "Missing" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
            {hasRTW && !allDocs.some((d) => d.type === "visa") && (
              <p className="px-6 py-2 text-xs text-neutral-400 italic border-t border-neutral-50">
                * Showing legacy right-to-work document for Visa/Passport slots
              </p>
            )}
          </Section>

          {/* Level Progression */}
          <Section title="Level Progression">
            {(invoiceHistory || []).length === 0 ? (
              <div className="px-6 py-4 text-sm text-neutral-400 italic">
                No invoice history yet — run the invoice scan to populate this.
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th className="px-6 py-2.5 text-left">Project</th>
                      <th className="px-6 py-2.5 text-left">Date</th>
                      <th className="px-6 py-2.5 text-left">Days</th>
                      <th className="px-6 py-2.5 text-left">Calculated</th>
                      <th className="px-6 py-2.5 text-left">Invoiced at</th>
                      <th className="px-6 py-2.5 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {(invoiceHistory || []).map((inv, i) => {
                      const n = i + 1;
                      const calcMain = Math.ceil(n / 3);
                      const calcSub = ((n - 1) % 3) + 1;
                      const calcLevel = parseFloat(`${calcMain}.${calcSub}`);
                      const invoicedLevel = inv.level_invoiced ? Number(inv.level_invoiced) : null;
                      const mismatch = invoicedLevel !== null && invoicedLevel !== calcLevel;
                      return (
                        <tr key={inv.id} className={mismatch ? "bg-red-50" : "hover:bg-neutral-50"}>
                          <td className="px-6 py-3">
                            <p className="font-medium text-neutral-900">{inv.project_name || "—"}</p>
                            <p className="text-xs text-neutral-400">{inv.school || ""}</p>
                          </td>
                          <td className="px-6 py-3 text-neutral-500 whitespace-nowrap">
                            {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-6 py-3 text-neutral-500">{inv.days}d</td>
                          <td className="px-6 py-3 font-semibold text-neutral-700">{calcLevel.toFixed(1)}</td>
                          <td className="px-6 py-3">
                            {invoicedLevel !== null ? (
                              <span className={`font-semibold ${mismatch ? "text-red-600" : "text-neutral-700"}`}>
                                {invoicedLevel.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-neutral-300 text-xs">not found</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            {mismatch && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                ⚠ Discrepancy
                              </span>
                            )}
                            {inv.pdf_url && (
                              <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-blue-500 hover:underline">
                                Invoice ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Work Orders */}
          <Section title={`Work Orders (${allWOs.length})`}>
            {allWOs.length === 0 ? (
              <p className="px-6 py-8 text-sm text-neutral-300 italic text-center">No work orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Project / School</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Program</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Dates</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {allWOs.map((wo) => {
                      const ws = WO_STATUS[wo.status] || WO_STATUS.draft;
                      return (
                        <tr key={wo.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <p className="text-sm font-semibold text-neutral-900">{wo.project_name || "—"}</p>
                            {wo.school && <p className="text-xs text-neutral-400 mt-0.5">{wo.school}</p>}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-neutral-500">{wo.program_type || "—"}</td>
                          <td className="px-4 py-3.5 text-xs text-neutral-500 whitespace-nowrap">{fmtDateRange(wo.start_date, wo.end_date)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ws.bg}`}>
                              {ws.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* TA Profile Documents (master copy stored on TA) */}
          <Section
            title="TA Profile Documents"
            headerRight={<GenerateDocsButton taId={id} />}
          >
            {taProfileDocs?.generated_at && (
              <p className="px-6 pt-3 pb-1 text-xs text-neutral-400">
                Last generated: {new Date(taProfileDocs.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {!taProfileDocs?.school_html && !taProfileDocs?.homestay_html ? (
              <div className="px-6 py-5">
                {docsReady ? (
                  <p className="text-sm text-neutral-400 italic">Profile is complete — click &ldquo;Generate Docs&rdquo; to create the documents.</p>
                ) : (
                  <>
                    <p className="text-sm text-neutral-500 font-medium mb-2">Waiting for TA to complete their profile</p>
                    <p className="text-xs text-neutral-400 mb-2">Docs will auto-generate once the TA saves these fields:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingForDocs.map((f) => (
                        <span key={f} className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
                          {f} missing
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {taProfileDocs?.school_html && (
                  <div className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-600">S</div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">School Profile</p>
                        <p className="text-xs text-neutral-400">Sent to schools · placed in project folder at WO signing</p>
                      </div>
                    </div>
                    <a
                      href={`/api/admin/teaching-artists/${id}/profile-doc?type=school`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      Preview ↗
                    </a>
                  </div>
                )}
                {taProfileDocs?.homestay_html && (
                  <div className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-100 text-xs font-bold text-purple-600">H</div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Homestay Profile</p>
                        <p className="text-xs text-neutral-400">Sent to homestay families · placed in project folder at WO signing</p>
                      </div>
                    </div>
                    <a
                      href={`/api/admin/teaching-artists/${id}/profile-doc?type=homestay`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      Preview ↗
                    </a>
                  </div>
                )}
              </div>
            )}
            {/* Copies placed in projects */}
            {(profileDocs || []).length > 0 && (
              <div className="border-t border-neutral-100 px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-300 mb-2">Placed in projects</p>
                <div className="space-y-1.5">
                  {(profileDocs || []).map((doc) => {
                    return (
                      <div key={doc.id} className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">{doc.name}</span>
                        <Link
                          href={`/admin/projects/${doc.project_id}`}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Project →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* Pay Level */}
          <SideCard title="Pay Level">
            <TALevelEditor
              taId={ta.id}
              currentLevel={Number(ta.pay_level) || 0}
              qualifyingProjects={ta.qualifying_projects ?? 0}
            />
            <div className="mt-4 space-y-2 text-sm divide-y divide-neutral-50">
              <div className="flex justify-between items-center pb-2">
                <span className="text-neutral-400 text-xs">Qualifying projects</span>
                <span className="font-semibold text-neutral-900">{ta.qualifying_projects ?? <Empty />}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-neutral-400 text-xs">Total projects</span>
                <span className="font-semibold text-neutral-900">{ta.total_projects ?? <Empty />}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-neutral-400 text-xs">Camps</span>
                <span className="font-semibold text-neutral-900">{ta.total_camps ?? 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-neutral-400 text-xs">PD credits</span>
                <span className="font-semibold text-neutral-900">{ta.pd_workshop_credits ?? <Empty />}</span>
              </div>
              {ta.category && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-neutral-400 text-xs">Category</span>
                  <span className="font-semibold text-neutral-900 text-xs">{ta.category}</span>
                </div>
              )}
            </div>
          </SideCard>

          {/* Training */}
          <SideCard title="Training">
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-700">Online Onboarding</span>
                <TrainingToggle taId={ta.id} field="training_online" checked={ta.training_online ?? false} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-700">Offline Foundation</span>
                <TrainingToggle taId={ta.id} field="training_offline" checked={ta.training_offline ?? false} />
              </div>
            </div>
          </SideCard>

          {/* Onboarding */}
          <SideCard title="Onboarding">
            <p className="text-base font-semibold capitalize text-neutral-900">
              {ta.onboarding_status?.replace(/_/g, " ") || <span className="text-neutral-300 italic font-normal">—</span>}
            </p>
          </SideCard>

          {/* Payroll & Banking */}
          <SideCard title="Payroll & Banking">
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-neutral-400 mb-0.5">IBAN</dt>
                <dd className="text-neutral-900 font-mono break-all">{ta.iban || <span className="text-neutral-300 italic not-italic font-sans">—</span>}</dd>
              </div>
              <div>
                <dt className="text-neutral-400 mb-0.5">BIC</dt>
                <dd className="text-neutral-900">{ta.bic || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400 mb-0.5">Bank</dt>
                <dd className="text-neutral-900">{ta.bank_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400 mb-0.5">Tax number</dt>
                <dd className="text-neutral-900">{ta.tax_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-400 mb-0.5">VAT registered</dt>
                <dd className="text-neutral-900">{ta.vat_registered ? `Yes — ${ta.vat_number || "no number"}` : "No"}</dd>
              </div>
            </dl>
          </SideCard>

          {/* Lanes & Planes */}
          <SideCard title="Lanes & Planes">
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <dt className="text-neutral-400">Synced</dt>
                <dd className={ta.lanes_planes_synced ? "text-green-600 font-medium" : "text-neutral-400"}>
                  {ta.lanes_planes_synced ? "Yes" : "No"}
                </dd>
              </div>
              {ta.lanes_planes_id && (
                <div>
                  <dt className="text-neutral-400 mb-0.5">L&amp;P ID</dt>
                  <dd className="text-neutral-900 font-mono">{ta.lanes_planes_id}</dd>
                </div>
              )}
              {ta.lanes_planes_synced_at && (
                <div>
                  <dt className="text-neutral-400 mb-0.5">Last sync</dt>
                  <dd className="text-neutral-600">{new Date(ta.lanes_planes_synced_at).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </SideCard>

          {/* Account */}
          <SideCard title="Account">
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-neutral-400 mb-0.5">Email</dt>
                <dd className="text-neutral-900 break-all">{ta.email}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-neutral-400">Status</dt>
                <dd className={ta.is_active ? "text-green-600 font-medium" : "text-neutral-500"}>
                  {ta.is_active ? "Active" : "Inactive"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400 mb-0.5">Joined</dt>
                <dd className="text-neutral-900">{new Date(ta.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd>
              </div>
              {ta.gdpr_consent_at && (
                <div>
                  <dt className="text-neutral-400 mb-0.5">GDPR consent</dt>
                  <dd className="text-neutral-600">{new Date(ta.gdpr_consent_at).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </SideCard>

          {/* Edit */}
          <TAProfileEditor ta={ta as any} compact />
        </div>
      </div>
    </div>
  );
}

