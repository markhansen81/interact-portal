"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

// ---------------------------------------------------------------------------
// Options — values match the onboarding wizard exactly
// ---------------------------------------------------------------------------

const NATIONALITY_OPTIONS = [
  { value: "American", label: "American" }, { value: "Australian", label: "Australian" },
  { value: "British", label: "British" }, { value: "Canadian", label: "Canadian" },
  { value: "Irish", label: "Irish" }, { value: "New Zealander", label: "New Zealander" },
  { value: "German", label: "German" },
  { value: "South African", label: "South African" },
  { value: "Afghan", label: "Afghan" }, { value: "Albanian", label: "Albanian" },
  { value: "Algerian", label: "Algerian" }, { value: "Argentinian", label: "Argentinian" },
  { value: "Austrian", label: "Austrian" }, { value: "Bangladeshi", label: "Bangladeshi" },
  { value: "Belgian", label: "Belgian" }, { value: "Bolivian", label: "Bolivian" },
  { value: "Brazilian", label: "Brazilian" }, { value: "Bulgarian", label: "Bulgarian" },
  { value: "Cameroonian", label: "Cameroonian" }, { value: "Chilean", label: "Chilean" },
  { value: "Chinese", label: "Chinese" }, { value: "Colombian", label: "Colombian" },
  { value: "Congolese", label: "Congolese" }, { value: "Costa Rican", label: "Costa Rican" },
  { value: "Croatian", label: "Croatian" }, { value: "Cuban", label: "Cuban" },
  { value: "Czech", label: "Czech" }, { value: "Danish", label: "Danish" },
  { value: "Dominican", label: "Dominican" }, { value: "Dutch", label: "Dutch" },
  { value: "Ecuadorian", label: "Ecuadorian" }, { value: "Egyptian", label: "Egyptian" },
  { value: "Ethiopian", label: "Ethiopian" }, { value: "Filipino", label: "Filipino" },
  { value: "Finnish", label: "Finnish" }, { value: "French", label: "French" },
  { value: "Ghanaian", label: "Ghanaian" }, { value: "Greek", label: "Greek" },
  { value: "Guatemalan", label: "Guatemalan" }, { value: "Haitian", label: "Haitian" },
  { value: "Honduran", label: "Honduran" }, { value: "Hungarian", label: "Hungarian" },
  { value: "Icelandic", label: "Icelandic" }, { value: "Indian", label: "Indian" },
  { value: "Indonesian", label: "Indonesian" }, { value: "Iranian", label: "Iranian" },
  { value: "Iraqi", label: "Iraqi" }, { value: "Israeli", label: "Israeli" },
  { value: "Italian", label: "Italian" }, { value: "Jamaican", label: "Jamaican" },
  { value: "Japanese", label: "Japanese" }, { value: "Jordanian", label: "Jordanian" },
  { value: "Kenyan", label: "Kenyan" }, { value: "Korean", label: "Korean" },
  { value: "Lebanese", label: "Lebanese" }, { value: "Malaysian", label: "Malaysian" },
  { value: "Mexican", label: "Mexican" }, { value: "Moroccan", label: "Moroccan" },
  { value: "Mozambican", label: "Mozambican" }, { value: "Nepalese", label: "Nepalese" },
  { value: "Nicaraguan", label: "Nicaraguan" }, { value: "Nigerian", label: "Nigerian" },
  { value: "Norwegian", label: "Norwegian" }, { value: "Pakistani", label: "Pakistani" },
  { value: "Palestinian", label: "Palestinian" }, { value: "Panamanian", label: "Panamanian" },
  { value: "Paraguayan", label: "Paraguayan" }, { value: "Peruvian", label: "Peruvian" },
  { value: "Polish", label: "Polish" }, { value: "Portuguese", label: "Portuguese" },
  { value: "Romanian", label: "Romanian" }, { value: "Russian", label: "Russian" },
  { value: "Rwandan", label: "Rwandan" }, { value: "Saudi", label: "Saudi" },
  { value: "Senegalese", label: "Senegalese" }, { value: "Serbian", label: "Serbian" },
  { value: "Singaporean", label: "Singaporean" }, { value: "Slovak", label: "Slovak" },
  { value: "Slovenian", label: "Slovenian" }, { value: "Somali", label: "Somali" },
  { value: "Spanish", label: "Spanish" }, { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Sudanese", label: "Sudanese" }, { value: "Swedish", label: "Swedish" },
  { value: "Swiss", label: "Swiss" }, { value: "Syrian", label: "Syrian" },
  { value: "Taiwanese", label: "Taiwanese" }, { value: "Tanzanian", label: "Tanzanian" },
  { value: "Thai", label: "Thai" }, { value: "Trinidadian", label: "Trinidadian" },
  { value: "Tunisian", label: "Tunisian" }, { value: "Turkish", label: "Turkish" },
  { value: "Ugandan", label: "Ugandan" }, { value: "Ukrainian", label: "Ukrainian" },
  { value: "Uruguayan", label: "Uruguayan" }, { value: "Venezuelan", label: "Venezuelan" },
  { value: "Vietnamese", label: "Vietnamese" }, { value: "Zimbabwean", label: "Zimbabwean" },
  { value: "Other", label: "Other" },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Female" }, { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" }, { value: "genderqueer", label: "Genderqueer" },
  { value: "agender", label: "Agender" }, { value: "other", label: "Other" },
  { value: "rather_not_say", label: "Prefer not to say" },
];

const PRONOUN_OPTIONS = [
  { value: "she/her", label: "She / Her" }, { value: "he/him", label: "He / Him" },
  { value: "they/them", label: "They / Them" }, { value: "she/they", label: "She / They" },
  { value: "he/they", label: "He / They" }, { value: "ze/hir", label: "Ze / Hir" },
  { value: "other", label: "Other" }, { value: "rather_not_say", label: "Prefer not to say" },
];

const YES_NO_PREFER = [
  { value: "yes", label: "Yes" }, { value: "no", label: "No" },
  { value: "rather_not_say", label: "Prefer not to say" },
];

const EDUCATION_OPTIONS = [
  { value: "high_school", label: "High School / GED" },
  { value: "some_college", label: "Some College / University" },
  { value: "associate", label: "Associate Degree" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate / PhD" },
  { value: "professional", label: "Professional Degree" },
];

const TEFL_OPTIONS = [
  { value: "yes", label: "Yes" }, { value: "no", label: "No" },
  { value: "in_progress", label: "Currently working on it" },
];

const GERMAN_OPTIONS = [
  { value: "none", label: "None" },
  { value: "A1", label: "A1 - Beginner" }, { value: "A2", label: "A2 - Elementary" },
  { value: "B1", label: "B1 - Intermediate" }, { value: "B2", label: "B2 - Upper Intermediate" },
  { value: "C1", label: "C1 - Advanced" }, { value: "C2", label: "C2 - Proficient" },
];

const ETHNICITY_OPTIONS = [
  { value: "white", label: "White" },
  { value: "black_african", label: "Black / African" },
  { value: "black_caribbean", label: "Black / Caribbean" },
  { value: "south_asian", label: "South Asian" },
  { value: "east_asian", label: "East Asian" },
  { value: "southeast_asian", label: "Southeast Asian" },
  { value: "middle_eastern", label: "Middle Eastern / North African" },
  { value: "latino", label: "Latino / Hispanic" },
  { value: "indigenous", label: "Indigenous / First Nations" },
  { value: "mixed", label: "Mixed / Multiracial" },
  { value: "other", label: "Other" },
  { value: "rather_not_say", label: "Prefer not to say" },
];

const CERT_OPTIONS = [
  { value: "no", label: "No" }, { value: "yes", label: "Yes" },
  { value: "in_progress", label: "In progress" },
];

const BAHNCARD_OPTIONS = [
  { value: "none", label: "None" }, { value: "25", label: "BahnCard 25" },
  { value: "50", label: "BahnCard 50" }, { value: "100", label: "BahnCard 100" },
];

const HOMESTAY_OPTIONS = [
  { value: "true", label: "Yes" }, { value: "false", label: "No" },
];

const PROGRAMS = {
  "Workshops & Weekly": [
    "Native Speaker Week", "Theatre Week", "Art in Action Week", "Media Week", "Film Week",
    "Kids Space Adventure", "Monster Parade", "Shakespeare Workshop", "Test Prep Workshop",
    "Job & Presentation Skills", "Global Speaker Week", "Debate Workshop",
  ],
  Kulturtag: ["Kulturtag Theatre", "Kulturtag Dance", "Kulturtag Music", "Kulturtag Art"],
  "Holiday Camps": [
    "Camp General", "Camp Amazing Me", "Camp Media", "Camp Music & Songwriting",
    "Camp Nature & Climate", "Camp Theatre", "Camp Dance",
  ],
  "Class Trips": [
    "Class Trip Theatre", "Class Trip English Team Building", "Class Trip Media",
    "Class Trip Music & Songwriting", "Class Trip Nature & Climate", "Class Trip Dance",
  ],
};

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

type Opt = { value: string; label: string };

function Field({ label, value, type = "text", options, onChange, half, textarea }: {
  label: string; value: string; type?: string; options?: Opt[];
  onChange: (v: string) => void; half?: boolean; textarea?: boolean;
}) {
  const cls = "block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:bg-zinc-800";

  if (options) {
    return (
      <div className={half ? "flex-1" : ""}>
        <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  if (textarea) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls + " resize-none"} />
      </div>
    );
  }

  return (
    <div className={half ? "flex-1" : ""}>
      <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600" />
      {label}
    </label>
  );
}

const DIETARY_CHOICES = [
  "Vegetarian", "Vegan", "Pescatarian", "Lactose intolerant", "Gluten intolerant",
  "Nut allergy", "Shellfish allergy", "Halal", "Kosher", "No pork",
];

function DietaryField({ options, other, onChangeOptions, onChangeOther }: {
  options: string[]; other: string;
  onChangeOptions: (v: string[]) => void; onChangeOther: (v: string) => void;
}) {
  const toggle = (item: string) => {
    if (options.includes(item)) {
      onChangeOptions(options.filter((o) => o !== item));
    } else {
      onChangeOptions([...options, item]);
    }
  };

  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-500">Dietary restrictions / allergies</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {DIETARY_CHOICES.map((item) => (
          <button
            key={item}
            onClick={() => toggle(item)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              options.includes(item)
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={other}
        onChange={(e) => onChangeOther(e.target.value)}
        placeholder="Other (please specify)"
        className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  );
}

function PhotoUpload({ label, subtitle, url, profileId, folder, onUploaded }: {
  label: string; subtitle: string; url: string | null; profileId: string;
  folder: string; onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const fileName = `${folder}/${profileId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("documents").upload(fileName, file);
    if (error) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
    onUploaded(urlData.publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-500">{label}</label>
      <p className="mb-3 text-xs text-zinc-400">{subtitle}</p>
      <div className="flex items-center gap-4">
        {url ? (
          <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700">
            <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          </div>
        )}
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            {uploading ? "Uploading..." : url ? "Change photo" : "Upload photo"}
          </button>
          <p className="mt-1 text-[10px] text-zinc-400">JPG or PNG, max 5MB</p>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

function Section({ title, children, onSave, saving }: {
  title: string; children: React.ReactNode; onSave: () => void; saving: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-7 py-5 dark:border-zinc-800">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <button onClick={onSave} disabled={saving}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      <div className="space-y-5 px-7 py-6">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  { id: "personal", label: "Personal" },
  { id: "quals", label: "Qualifications" },
  { id: "payroll", label: "Payroll" },
  { id: "programs", label: "Working with InterACT" },
  { id: "school", label: "School Profile" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProfileEditor({
  profile: p,
  documents,
  preferences: initialPrefs,
}: {
  profile: Profile;
  documents: Document[];
  preferences: Preference[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("personal");
  const [saving, setSaving] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>(() => {
    const d: Record<string, unknown> = {};
    for (const key of Object.keys(p)) {
      if (p[key] !== null && p[key] !== undefined) d[key] = p[key];
    }
    return d;
  });
  const [prefs, setPrefs] = useState<Record<string, string>>(() => {
    const pr: Record<string, string> = {};
    for (const pref of initialPrefs) pr[pref.program_type] = pref.preference;
    return pr;
  });

  const v = (field: string) => (data[field] as string) || "";
  const b = (field: string) => !!data[field];
  const set = (field: string, value: unknown) => setData((prev) => ({ ...prev, [field]: value }));

  async function saveFields(section: string, fields: string[]) {
    setSaving(section);
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      let val = data[f] ?? null;
      if (val === "true") val = true;
      if (val === "false") val = false;
      body[f] = val;
    }
    try {
      await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } catch {
      alert("Failed to save. Please try again.");
    }
    setSaving(null);
  }

  async function savePrograms() {
    setSaving("programs");
    let hw: unknown = data.homestay_willing ?? null;
    if (hw === "true") hw = true;
    if (hw === "false") hw = false;
    try {
      await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_preferences: prefs,
          homestay_willing: hw,
          lifeguard_cert: data.lifeguard_cert ?? null,
          drivers_licence: data.drivers_licence ?? null,
          dietary_options: data.dietary_options ?? [],
          dietary_restrictions: data.dietary_restrictions ?? null,
          exp_disabilities: data.exp_disabilities ?? false,
          exp_disability_description: data.exp_disability_description ?? null,
        }),
      });
      router.refresh();
    } catch {
      alert("Failed to save. Please try again.");
    }
    setSaving(null);
  }

  const docsByType = new Map(documents.map((d) => [d.type, d]));

  return (
    <div>
      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200/80 bg-zinc-100/50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-[13px] font-medium transition-all ${
              tab === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "personal" && (
        <Section title="Contact & Identity" saving={saving === "contact"}
          onSave={() => saveFields("contact", [
            "photo_url", "school_photo_url", "first_name", "last_name", "preferred_name", "phone", "phone_consent",
            "street", "postal_code", "city", "country", "date_of_birth",
            "nationality", "gender", "pronouns", "lgbtqia", "ethnicity", "caretaker_status",
          ])}>
          <PhotoUpload
            label="Profile photo"
            subtitle="Your main photo — used across the portal and admin views."
            url={(data.photo_url as string) || null}
            profileId={p.id}
            folder="photos"
            onUploaded={(url) => {
              set("photo_url", url);
              if (!data.school_photo_url) set("school_photo_url", url);
            }}
          />
          <div className="flex gap-4">
            <Field label="First name" value={v("first_name")} onChange={(val) => set("first_name", val)} half />
            <Field label="Last name" value={v("last_name")} onChange={(val) => set("last_name", val)} half />
          </div>
          <Field label="Preferred name" value={v("preferred_name")} onChange={(val) => set("preferred_name", val)} />
          <div className="flex gap-4">
            <Field label="Phone" value={v("phone")} onChange={(val) => set("phone", val)} half />
            <div className="flex-1 flex items-end pb-1">
              <Checkbox label="WhatsApp / SMS consent" checked={b("phone_consent")} onChange={(val) => set("phone_consent", val)} />
            </div>
          </div>
          <Field label="Street & house number" value={v("street")} onChange={(val) => set("street", val)} />
          <div className="flex gap-4">
            <Field label="Postal code" value={v("postal_code")} onChange={(val) => set("postal_code", val)} half />
            <Field label="City" value={v("city")} onChange={(val) => set("city", val)} half />
          </div>
          <Field label="Country" value={v("country")} options={[
            { value: "Germany", label: "Germany" },
            { value: "Austria", label: "Austria" }, { value: "Switzerland", label: "Switzerland" },
            { value: "United Kingdom", label: "United Kingdom" }, { value: "United States", label: "United States" },
            { value: "Australia", label: "Australia" }, { value: "Canada", label: "Canada" },
            { value: "Ireland", label: "Ireland" }, { value: "New Zealand", label: "New Zealand" },
            { value: "South Africa", label: "South Africa" }, { value: "France", label: "France" },
            { value: "Netherlands", label: "Netherlands" }, { value: "Belgium", label: "Belgium" },
            { value: "Denmark", label: "Denmark" }, { value: "Italy", label: "Italy" },
            { value: "Spain", label: "Spain" }, { value: "Poland", label: "Poland" },
            { value: "Czech Republic", label: "Czech Republic" }, { value: "Sweden", label: "Sweden" },
            { value: "Other", label: "Other" },
          ]} onChange={(val) => set("country", val)} />
          <Field label="Date of birth" value={v("date_of_birth")} type="date" onChange={(val) => set("date_of_birth", val)} />
          <Field label="Nationality" value={v("nationality")} options={NATIONALITY_OPTIONS} onChange={(val) => set("nationality", val)} />
          <div className="flex gap-4">
            <Field label="Gender" value={v("gender")} options={GENDER_OPTIONS} onChange={(val) => set("gender", val)} half />
            <Field label="Pronouns" value={v("pronouns")} options={PRONOUN_OPTIONS} onChange={(val) => set("pronouns", val)} half />
          </div>
          <div className="flex gap-4">
            <Field label="LGBTQIA+" value={v("lgbtqia")} options={YES_NO_PREFER} onChange={(val) => set("lgbtqia", val)} half />
            <Field label="Ethnicity" value={v("ethnicity")} options={ETHNICITY_OPTIONS} onChange={(val) => set("ethnicity", val)} half />
          </div>
          <Field label="Caretaker status" value={v("caretaker_status")} options={YES_NO_PREFER} onChange={(val) => set("caretaker_status", val)} />
        </Section>
      )}

      {tab === "quals" && (
        <Section title="Qualifications & Experience" saving={saving === "quals"}
          onSave={() => saveFields("quals", [
            "education_level", "tefl_status", "german_level", "german_professional",
            "art_profession", "certifications",
            "exp_grades_1_4", "exp_grades_5_7", "exp_grades_8_plus",
                      ])}>
          <div className="flex gap-4">
            <Field label="Education" value={v("education_level")} options={EDUCATION_OPTIONS} onChange={(val) => set("education_level", val)} half />
            <Field label="TEFL / TESL / TESOL" value={v("tefl_status")} options={TEFL_OPTIONS} onChange={(val) => set("tefl_status", val)} half />
          </div>
          <div className="flex gap-4">
            <Field label="German level" value={v("german_level")} options={GERMAN_OPTIONS} onChange={(val) => set("german_level", val)} half />
            <div className="flex-1 flex items-end pb-1">
              <Checkbox label="Comfortable with professional German" checked={b("german_professional")} onChange={(val) => set("german_professional", val)} />
            </div>
          </div>
          <Field label="Art profession" value={v("art_profession")} onChange={(val) => set("art_profession", val)} />
          <Field label="Certifications & relevant experience" value={v("certifications")} onChange={(val) => set("certifications", val)} textarea />
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Teaching experience (age groups)</label>
            <div className="space-y-2">
              <Checkbox label="Grades 1-4 (ages 6-9)" checked={b("exp_grades_1_4")} onChange={(val) => set("exp_grades_1_4", val)} />
              <Checkbox label="Grades 5-7 (ages 10-12)" checked={b("exp_grades_5_7")} onChange={(val) => set("exp_grades_5_7", val)} />
              <Checkbox label="Grades 8+ (ages 13+)" checked={b("exp_grades_8_plus")} onChange={(val) => set("exp_grades_8_plus", val)} />
            </div>
          </div>
        </Section>
      )}

      {tab === "payroll" && (
        <div className="space-y-6">
          <Section title="Bank Details" saving={saving === "payroll"}
            onSave={() => saveFields("payroll", [
              "iban", "bank_name", "tax_number", "vat_registered", "vat_number",
              "bahncard", "bahncard_expiry", "deutschlandticket",
            ])}>
            <div className="flex gap-4">
              <Field label="IBAN" value={v("iban")} onChange={(val) => set("iban", val)} half />
              <Field label="Bank name" value={v("bank_name")} onChange={(val) => set("bank_name", val)} half />
            </div>
            <Field label="Tax number (Steuernummer)" value={v("tax_number")} onChange={(val) => set("tax_number", val)} />
            <Checkbox label="VAT registered (Umsatzsteuer)" checked={b("vat_registered")} onChange={(val) => set("vat_registered", val)} />
            {b("vat_registered") && (
              <Field label="VAT Number (USt-IdNr)" value={v("vat_number")} onChange={(val) => set("vat_number", val)} />
            )}
            <div className="flex gap-4">
              <Field label="BahnCard" value={v("bahncard")} options={BAHNCARD_OPTIONS} onChange={(val) => set("bahncard", val)} half />
              <Field label="BahnCard expiry" value={v("bahncard_expiry")} type="date" onChange={(val) => set("bahncard_expiry", val)} half />
            </div>
            <Checkbox label="Deutschlandticket subscription" checked={b("deutschlandticket")} onChange={(val) => set("deutschlandticket", val)} />
          </Section>

        </div>
      )}

      {tab === "programs" && (
        <Section title="Working with InterACT" saving={saving === "programs"} onSave={savePrograms}>
          <Field label="Homestay" value={String(data.homestay_willing ?? "")} options={HOMESTAY_OPTIONS} onChange={(val) => set("homestay_willing", val)} />
          <div className="flex gap-4">
            <Field label="Lifeguard cert" value={v("lifeguard_cert")} options={CERT_OPTIONS} onChange={(val) => set("lifeguard_cert", val)} half />
            <Field label="Driver's licence" value={v("drivers_licence")} options={CERT_OPTIONS} onChange={(val) => set("drivers_licence", val)} half />
          </div>
          <DietaryField
            options={(data.dietary_options as string[]) || []}
            other={v("dietary_restrictions")}
            onChangeOptions={(val) => set("dietary_options", val)}
            onChangeOther={(val) => set("dietary_restrictions", val)}
          />
          <div>
            <label className="mb-2 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Experience with disabilities</label>
            <Checkbox label="Experience working with children with disabilities" checked={b("exp_disabilities")} onChange={(val) => set("exp_disabilities", val)} />
            {b("exp_disabilities") && (
              <div className="mt-3">
                <Field label="Describe your experience" value={v("exp_disability_description")} onChange={(val) => set("exp_disability_description", val)} textarea />
              </div>
            )}
          </div>
          <p className="text-sm text-zinc-500 mb-4">Select your experience level for each program.</p>
          {Object.entries(PROGRAMS).map(([group, items]) => (
            <div key={group} className="mb-6">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{group}</h4>
              <div className="space-y-1">
                {items.map((prog) => (
                  <div key={prog} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{prog}</span>
                    <div className="flex gap-1">
                      {(["no", "yes", "pro"] as const).map((opt) => (
                        <button key={opt}
                          onClick={() => setPrefs((prev) => ({ ...prev, [prog]: prev[prog] === opt ? "" : opt }))}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            prefs[prog] === opt
                              ? opt === "pro" ? "bg-green-600 text-white" : opt === "yes" ? "bg-blue-600 text-white" : "bg-zinc-600 text-white"
                              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}>
                          {opt === "pro" ? "Pro" : opt === "yes" ? "Can do" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {tab === "school" && (
        <Section title="TA School Profile" saving={saving === "school"}
          onSave={() => saveFields("school", [
            "school_photo_url", "hometown_city", "hometown_country", "moved_to_germany", "likes_germany",
            "vacation_spot", "great_at", "not_great_at", "art_type", "superpower",
            "comic_title", "famous_last_words", "favourite_food", "bio",
          ])}>
          <PhotoUpload
            label="School profile photo"
            subtitle="This is what schools and kids see. Can be the same as your main photo, or something more fun!"
            url={(data.school_photo_url as string) || (data.photo_url as string) || null}
            profileId={p.id}
            folder="school-photos"
            onUploaded={(url) => set("school_photo_url", url)}
          />
          <div className="flex gap-4">
            <Field label="Hometown" value={v("hometown_city")} onChange={(val) => set("hometown_city", val)} half />
            <Field label="Home country" value={v("hometown_country")} onChange={(val) => set("hometown_country", val)} half />
          </div>
          <Field label="When did you move to Germany, and why?" value={v("moved_to_germany")} onChange={(val) => set("moved_to_germany", val)} textarea />
          <Field label="What do you like about Germany?" value={v("likes_germany")} onChange={(val) => set("likes_germany", val)} />
          <Field label="Favourite vacation spot" value={v("vacation_spot")} onChange={(val) => set("vacation_spot", val)} />
          <div className="flex gap-4">
            <Field label="Something you're great at" value={v("great_at")} onChange={(val) => set("great_at", val)} half />
            <Field label="Something you're not great at" value={v("not_great_at")} onChange={(val) => set("not_great_at", val)} half />
          </div>
          <Field label="What kind of art do you make or enjoy?" value={v("art_type")} onChange={(val) => set("art_type", val)} />
          <div className="flex gap-4">
            <Field label="Superpower" value={v("superpower")} onChange={(val) => set("superpower", val)} half />
            <Field label="Comic book title" value={v("comic_title")} onChange={(val) => set("comic_title", val)} half />
          </div>
          <Field label="Famous last words" value={v("famous_last_words")} onChange={(val) => set("famous_last_words", val)} />
          <Field label="Favourite food" value={v("favourite_food")} onChange={(val) => set("favourite_food", val)} />
          <Field label="Bio (60-80 words)" value={v("bio")} onChange={(val) => set("bio", val)} textarea />
        </Section>
      )}

    </div>
  );
}
