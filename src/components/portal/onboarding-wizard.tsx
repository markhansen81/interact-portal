"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  phone: string | null;
  address: string | null;
  onboarding_status: string;
  [key: string]: unknown;
}

interface Document {
  id: string;
  type: string;
  status: string;
  expiry_date: string | null;
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

const DOCUMENT_TYPES = [
  { type: "right_to_work", label: "Work Permit / Passport / Visa", required: true, gate: true },
  { type: "police_check", label: "Extended Police Check (Führungszeugnis)", required: true },
  { type: "measles", label: "Measles Vaccination Proof", required: true },
  { type: "first_aid", label: "First Aid Certificate", required: false },
];

export function OnboardingWizard({
  profile,
  documents,
  preferences: _preferences,
}: {
  profile: Profile;
  documents: Document[];
  preferences: Preference[];
}) {
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const docsByType = new Map(documents.map((d) => [d.type, d]));
  const rightToWork = docsByType.get("right_to_work");
  const gateCleared = rightToWork?.status === "uploaded" || rightToWork?.status === "verified";

  async function saveSection(data: Record<string, unknown>) {
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Progress Sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500">Profile Setup</h3>
          <div className="mt-3 space-y-1">
            {SECTIONS.map((section, i) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  activeSection === i
                    ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {i + 1}
                </span>
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Checklist */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-500">Documents</h3>
          <div className="mt-3 space-y-2">
            {DOCUMENT_TYPES.map((doc) => {
              const existing = docsByType.get(doc.type);
              const status = existing?.status || "not_uploaded";
              return (
                <div key={doc.type} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status === "verified"
                        ? "bg-green-500"
                        : status === "uploaded"
                          ? "bg-blue-500"
                          : "bg-zinc-300"
                    }`}
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {doc.label}
                    {doc.gate && !gateCleared && (
                      <span className="ml-1 text-red-500">*required first</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Section */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {SECTIONS[activeSection].label}
            </h3>
            {saved && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
            {saving && (
              <span className="text-sm text-zinc-500">Saving...</span>
            )}
          </div>

          <div className="mt-6">
            {activeSection === 0 && (
              <ContactSection profile={profile} onSave={saveSection} />
            )}
            {activeSection === 1 && (
              <AboutSection profile={profile} onSave={saveSection} />
            )}
            {activeSection === 2 && (
              <PlaceholderSection name="Language & Qualifications" />
            )}
            {activeSection === 3 && (
              <PlaceholderSection name="Teaching Experience" />
            )}
            {activeSection === 4 && (
              <PlaceholderSection name="Programs & Skills" />
            )}
            {activeSection === 5 && (
              <PlaceholderSection name="Logistics" />
            )}
            {activeSection === 6 && (
              <PlaceholderSection name="Payroll & Admin" />
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
              disabled={activeSection === 0}
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setActiveSection(Math.min(SECTIONS.length - 1, activeSection + 1))
              }
              disabled={activeSection === SECTIONS.length - 1}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactSection({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    preferred_name: profile.preferred_name || "",
    phone: profile.phone || "",
    address: profile.address || "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First Name *" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
        <FormField label="Last Name *" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        <FormField label="Preferred Name" value={form.preferred_name} onChange={(v) => setForm({ ...form, preferred_name: v })} />
        <FormField label="Phone (+49...)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="col-span-2">
          <FormField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        </div>
      </div>
      <button
        onClick={() => onSave(form)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Save & Continue
      </button>
    </div>
  );
}

function AboutSection({
  profile: _profile,
  onSave: _onSave,
}: {
  profile: Profile;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Tell us about yourself! This helps us match you to the right projects and builds your profile.
      </p>
      <PlaceholderSection name="About You — fields coming soon (where are you from, when did you move to Germany, favourite food, bio, etc.)" />
    </div>
  );
}

function PlaceholderSection({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
      <p className="text-sm text-zinc-500">{name}</p>
      <p className="mt-1 text-xs text-zinc-400">This section will be built out with full form fields.</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </div>
  );
}
