"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  [key: string]: unknown;
}

interface Document {
  type: string;
  status: string;
}

interface Preference {
  program_type: string;
  preference: string;
}

const SECTIONS = [
  { id: "contact", label: "Contact & Identity" },
  { id: "about", label: "About You" },
  { id: "qualifications", label: "Language & Qualifications" },
  { id: "experience", label: "Teaching Experience" },
  { id: "programs", label: "Programs & Skills" },
  { id: "logistics", label: "Logistics" },
  { id: "payroll", label: "Payroll & Admin" },
];

const DOC_TYPES = [
  { type: "right_to_work", label: "Work Permit / Passport / Visa", gate: true },
  { type: "police_check", label: "Extended Police Check" },
  { type: "measles", label: "Measles Vaccination" },
  { type: "first_aid", label: "First Aid Certificate" },
];

export function OnboardingWizard({
  profile: p,
  documents,
  preferences: _prefs,
}: {
  profile: Profile;
  documents: Document[];
  preferences: Preference[];
}) {
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const docsByType = new Map(documents.map((d) => [d.type, d]));
  const gateCleared = ["uploaded", "verified"].includes(docsByType.get("right_to_work")?.status || "");
  const sectionsComplete = (p.onboarding_sections_complete || {}) as Record<string, boolean>;

  async function save(data: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function saveSection(sectionId: string, data: Record<string, unknown>) {
    const updated = { ...sectionsComplete, [sectionId]: true };
    await save({ ...data, onboarding_sections_complete: updated });
  }

  const completedCount = Object.values(sectionsComplete).filter(Boolean).length;
  const progress = Math.round((completedCount / SECTIONS.length) * 100);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Profile</h3>
            <span className="text-xs text-zinc-400">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 space-y-1">
            {SECTIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  active === i
                    ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  sectionsComplete[s.id] ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}>
                  {sectionsComplete[s.id] ? "✓" : i + 1}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500">Documents</h3>
          <div className="mt-3 space-y-2">
            {DOC_TYPES.map((d) => {
              const status = docsByType.get(d.type)?.status || "not_uploaded";
              return (
                <div key={d.type} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    status === "verified" ? "bg-green-500" : status === "uploaded" ? "bg-blue-500" : "bg-zinc-300"
                  }`} />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {d.label}
                    {d.gate && !gateCleared && <span className="ml-1 text-red-500">*</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{SECTIONS[active].label}</h3>
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            {saving && <span className="text-sm text-zinc-500">Saving...</span>}
          </div>

          {active === 0 && <ContactSection p={p} onSave={(d) => saveSection("contact", d)} />}
          {active === 1 && <AboutSection p={p} onSave={(d) => saveSection("about", d)} />}
          {active === 2 && <QualificationsSection p={p} onSave={(d) => saveSection("qualifications", d)} />}
          {active === 3 && <ExperienceSection p={p} onSave={(d) => saveSection("experience", d)} />}
          {active === 4 && <ProgramsSection p={p} onSave={(d) => saveSection("programs", d)} />}
          {active === 5 && <LogisticsSection p={p} onSave={(d) => saveSection("logistics", d)} />}
          {active === 6 && <PayrollSection p={p} onSave={(d) => saveSection("payroll", d)} />}

          <div className="mt-8 flex justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400">
              Previous
            </button>
            <button onClick={() => setActive(Math.min(6, active + 1))} disabled={active === 6}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Section Components ---

function F({ label, value, onChange, placeholder, required, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" required={required} />
    </div>
  );
}

function Sel({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
      Save & Continue
    </button>
  );
}

function ContactSection({ p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  const [f, set] = useState({
    first_name: (p.first_name as string) || "", last_name: (p.last_name as string) || "",
    preferred_name: (p.preferred_name as string) || "", phone: (p.phone as string) || "",
    address: (p.address as string) || "", date_of_birth: (p.date_of_birth as string) || "",
    nationality: (p.nationality as string) || "", gender: (p.gender as string) || "",
    pronouns: (p.pronouns as string) || "", lgbtqia: (p.lgbtqia as string) || "",
    ethnicity: (p.ethnicity as string) || "", caretaker_status: (p.caretaker_status as string) || "",
  });
  const u = (k: string, v: string) => set({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="First Name" value={f.first_name} onChange={(v) => u("first_name", v)} required />
        <F label="Last Name" value={f.last_name} onChange={(v) => u("last_name", v)} required />
        <F label="Preferred Name" value={f.preferred_name} onChange={(v) => u("preferred_name", v)} placeholder="Nickname" />
        <F label="Phone" value={f.phone} onChange={(v) => u("phone", v)} placeholder="+49..." />
        <div className="col-span-2"><F label="Address" value={f.address} onChange={(v) => u("address", v)} /></div>
        <F label="Date of Birth" value={f.date_of_birth} onChange={(v) => u("date_of_birth", v)} type="date" />
        <F label="Nationality" value={f.nationality} onChange={(v) => u("nationality", v)} />
        <Sel label="Gender" value={f.gender} onChange={(v) => u("gender", v)} options={[
          { value: "female", label: "Female" }, { value: "male", label: "Male" },
          { value: "non-binary", label: "Non-binary" }, { value: "rather_not_say", label: "Rather not say" },
        ]} />
        <Sel label="Pronouns" value={f.pronouns} onChange={(v) => u("pronouns", v)} options={[
          { value: "she/her", label: "She/her" }, { value: "he/him", label: "He/him" },
          { value: "they/them", label: "They/them" }, { value: "other", label: "Other" },
          { value: "rather_not_say", label: "Rather not say" },
        ]} />
        <Sel label="LGBTQIA+" value={f.lgbtqia} onChange={(v) => u("lgbtqia", v)} options={[
          { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "rather_not_say", label: "Rather not say" },
        ]} />
        <F label="Ethnicity" value={f.ethnicity} onChange={(v) => u("ethnicity", v)} />
        <Sel label="Caretaker Status" value={f.caretaker_status} onChange={(v) => u("caretaker_status", v)} options={[
          { value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "rather_not_say", label: "Rather not say" },
        ]} />
      </div>
      <SaveBtn onClick={() => onSave(f)} />
    </div>
  );
}

function AboutSection({ p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  const [f, set] = useState({
    where_from: (p.where_from as string) || "", moved_to_germany: (p.moved_to_germany as string) || "",
    likes_germany: (p.likes_germany as string) || "", vacation_spot: (p.vacation_spot as string) || "",
    great_at: (p.great_at as string) || "", not_great_at: (p.not_great_at as string) || "",
    art_type: (p.art_type as string) || "", superpower: (p.superpower as string) || "",
    comic_title: (p.comic_title as string) || "", famous_last_words: (p.famous_last_words as string) || "",
    favourite_food: (p.favourite_food as string) || "", bio: (p.bio as string) || "",
  });
  const u = (k: string, v: string) => set({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">Tell us about yourself! This builds your profile and helps us match you.</p>
      <div className="grid grid-cols-2 gap-4">
        <F label="Where are you from?" value={f.where_from} onChange={(v) => u("where_from", v)} />
        <F label="Favourite place to vacation?" value={f.vacation_spot} onChange={(v) => u("vacation_spot", v)} />
        <div className="col-span-2"><F label="When did you move to Germany and why?" value={f.moved_to_germany} onChange={(v) => u("moved_to_germany", v)} /></div>
        <div className="col-span-2"><F label="What do you like about living in Germany?" value={f.likes_germany} onChange={(v) => u("likes_germany", v)} /></div>
        <F label="Something you're great at" value={f.great_at} onChange={(v) => u("great_at", v)} />
        <F label="Something you're not great at" value={f.not_great_at} onChange={(v) => u("not_great_at", v)} />
        <F label="What kind of art do you make or like?" value={f.art_type} onChange={(v) => u("art_type", v)} />
        <F label="If you could have a superpower?" value={f.superpower} onChange={(v) => u("superpower", v)} />
        <F label="Comic book title of your life?" value={f.comic_title} onChange={(v) => u("comic_title", v)} />
        <F label="Famous last words..." value={f.famous_last_words} onChange={(v) => u("famous_last_words", v)} />
        <F label="Favourite food" value={f.favourite_food} onChange={(v) => u("favourite_food", v)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Short bio (60-80 words, optional)</label>
        <textarea value={f.bio} onChange={(e) => u("bio", e.target.value)} className="input" rows={3} placeholder="A short bio for the website..." />
      </div>
      <SaveBtn onClick={() => onSave(f)} />
    </div>
  );
}

function QualificationsSection({ p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  const [f, set] = useState({
    education_level: (p.education_level as string) || "", certifications: (p.certifications as string) || "",
    art_profession: (p.art_profession as string) || "", tefl_status: (p.tefl_status as string) || "",
    german_level: (p.german_level as string) || "", german_professional: (p.german_professional as boolean) || false,
  });
  const u = (k: string, v: unknown) => set({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Sel label="Highest Education Level" value={f.education_level} onChange={(v) => u("education_level", v)} options={[
          { value: "high_school", label: "High School" }, { value: "bachelors", label: "Bachelor's" },
          { value: "masters", label: "Master's" }, { value: "doctorate", label: "Doctorate" },
          { value: "professional", label: "Professional" },
        ]} />
        <Sel label="TEFL/TESL/TESOL" value={f.tefl_status} onChange={(v) => u("tefl_status", v)} options={[
          { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "in_progress", label: "In progress" },
        ]} />
        <Sel label="German Level" value={f.german_level} onChange={(v) => u("german_level", v)} options={
          ["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => ({ value: l, label: l }))
        } />
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={f.german_professional} onChange={(e) => u("german_professional", e.target.checked)} className="rounded" />
            Comfortable speaking German professionally?
          </label>
        </div>
        <div className="col-span-2"><F label="Art profession?" value={f.art_profession} onChange={(v) => u("art_profession", v)} placeholder="Max 50 words" /></div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Relevant degrees, certifications & experiences</label>
          <textarea value={f.certifications} onChange={(e) => u("certifications", e.target.value)} className="input" rows={3} />
        </div>
      </div>
      <SaveBtn onClick={() => onSave(f)} />
    </div>
  );
}

function ExperienceSection({ p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  const [f, set] = useState({
    exp_grades_1_4: (p.exp_grades_1_4 as boolean) || false,
    exp_grades_5_7: (p.exp_grades_5_7 as boolean) || false,
    exp_grades_8_plus: (p.exp_grades_8_plus as boolean) || false,
    exp_disabilities: (p.exp_disabilities as boolean) || false,
    exp_disability_description: (p.exp_disability_description as string) || "",
  });
  const u = (k: string, v: unknown) => set({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">Which age groups have you taught?</p>
      <div className="space-y-2">
        {[
          { key: "exp_grades_1_4", label: "Grades 1-4 (ages 6-9)" },
          { key: "exp_grades_5_7", label: "Grades 5-7 (ages 10-12)" },
          { key: "exp_grades_8_plus", label: "Grades 8+ (ages 13+)" },
        ].map((g) => (
          <label key={g.key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={f[g.key as keyof typeof f] as boolean} onChange={(e) => u(g.key, e.target.checked)} className="rounded" />
            {g.label}
          </label>
        ))}
      </div>
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={f.exp_disabilities} onChange={(e) => u("exp_disabilities", e.target.checked)} className="rounded" />
          Experience working with kids with disabilities?
        </label>
        {f.exp_disabilities && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Describe your experience</label>
            <textarea value={f.exp_disability_description} onChange={(e) => u("exp_disability_description", e.target.value)} className="input" rows={3} />
          </div>
        )}
      </div>
      <SaveBtn onClick={() => onSave(f)} />
    </div>
  );
}

function ProgramsSection({ p: _p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  // TODO: Save to ta_program_preferences table instead of profile
  const programs = {
    "Workshops & Weekly": ["Native Speaker Week", "Theatre Week", "Art in Action Week", "Media Week", "Film Week",
      "Kids Space Adventure", "Monster Parade", "Shakespeare Workshop", "Test Prep Workshop",
      "Job & Presentation Skills", "Global Speaker Week", "Debate Workshop"],
    "Kulturtag": ["Kulturtag Theatre", "Kulturtag Dance", "Kulturtag Music", "Kulturtag Art"],
    "Holiday Camps": ["Camp General", "Camp Amazing Me", "Camp Media", "Camp Music & Songwriting",
      "Camp Nature & Climate", "Camp Theatre", "Camp Dance"],
    "Class Trips": ["Class Trip Theatre", "Class Trip English Team Building", "Class Trip Media",
      "Class Trip Music & Songwriting", "Class Trip Nature & Climate", "Class Trip Dance"],
  };

  const [prefs, setPrefs] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">Which programs can you teach? Select your level for each.</p>
      {Object.entries(programs).map(([group, items]) => (
        <div key={group}>
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">{group}</h4>
          <div className="space-y-1">
            {items.map((prog) => (
              <div key={prog} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{prog}</span>
                <div className="flex gap-1">
                  {["no", "yes", "pro"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPrefs({ ...prefs, [prog]: prefs[prog] === opt ? "" : opt })}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        prefs[prog] === opt
                          ? opt === "pro" ? "bg-green-100 text-green-700" : opt === "yes" ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600"
                          : "text-zinc-400 hover:bg-zinc-100"
                      }`}
                    >
                      {opt === "pro" ? "Pro" : opt === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <SaveBtn onClick={() => onSave({ program_preferences: prefs })} />
    </div>
  );
}

function LogisticsSection({ p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  const [f, set] = useState({
    dietary_restrictions: (p.dietary_restrictions as string) || "",
    homestay_willing: (p.homestay_willing as boolean) ?? true,
    lifeguard_cert: (p.lifeguard_cert as string) || "",
    drivers_licence: (p.drivers_licence as string) || "",
    bahncard: (p.bahncard as string) || "",
    bahncard_expiry: (p.bahncard_expiry as string) || "",
    deutschlandticket: (p.deutschlandticket as boolean) || false,
  });
  const u = (k: string, v: unknown) => set({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><F label="Dietary Restrictions / Allergies" value={f.dietary_restrictions} onChange={(v) => u("dietary_restrictions", v)} /></div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={f.homestay_willing} onChange={(e) => u("homestay_willing", e.target.checked)} className="rounded" />
            Willing to stay in a homestay
          </label>
        </div>
        <Sel label="Lifeguard Certification" value={f.lifeguard_cert} onChange={(v) => u("lifeguard_cert", v)} options={[
          { value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "in_progress", label: "In progress" },
        ]} />
        <Sel label="Driver's Licence (valid in Germany)" value={f.drivers_licence} onChange={(v) => u("drivers_licence", v)} options={[
          { value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "in_progress", label: "In progress" },
        ]} />
        <Sel label="BahnCard" value={f.bahncard} onChange={(v) => u("bahncard", v)} options={[
          { value: "none", label: "None" }, { value: "25", label: "BahnCard 25" },
          { value: "50", label: "BahnCard 50" }, { value: "100", label: "BahnCard 100" },
        ]} />
        {f.bahncard && f.bahncard !== "none" && (
          <F label="BahnCard Expiry" value={f.bahncard_expiry} onChange={(v) => u("bahncard_expiry", v)} type="date" />
        )}
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={f.deutschlandticket} onChange={(e) => u("deutschlandticket", e.target.checked)} className="rounded" />
            Deutschlandticket subscription
          </label>
        </div>
      </div>
      <SaveBtn onClick={() => onSave(f)} />
    </div>
  );
}

function PayrollSection({ p, onSave }: { p: Profile; onSave: (d: Record<string, unknown>) => void }) {
  const [f, set] = useState({
    iban: (p.iban as string) || "", bank_name: (p.bank_name as string) || "",
    tax_number: (p.tax_number as string) || "", vat_registered: (p.vat_registered as boolean) || false,
    vat_number: (p.vat_number as string) || "",
  });
  const u = (k: string, v: unknown) => set({ ...f, [k]: v });
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">This information pre-populates your invoices.</p>
      <div className="grid grid-cols-2 gap-4">
        <F label="IBAN" value={f.iban} onChange={(v) => u("iban", v)} placeholder="DE..." />
        <F label="Bank Name" value={f.bank_name} onChange={(v) => u("bank_name", v)} />
        <F label="Tax Number (Steuernummer)" value={f.tax_number} onChange={(v) => u("tax_number", v)} />
        <div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={f.vat_registered} onChange={(e) => u("vat_registered", e.target.checked)} className="rounded" />
            VAT registered (Umsatzsteuer)
          </label>
          {f.vat_registered && (
            <div className="mt-2">
              <F label="VAT Number (USt-IdNr)" value={f.vat_number} onChange={(v) => u("vat_number", v)} />
            </div>
          )}
        </div>
      </div>
      <SaveBtn onClick={() => onSave(f)} />
    </div>
  );
}
