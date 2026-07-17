"use client";

import { useState, useEffect, useRef } from "react";
import { t, type Locale } from "./translations";

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  roles: string[];
  school_name: string;
  street: string;
  postcode: string;
  city: string;
  state: string;
  school_type: string;
  has_dates: boolean | null;
  preferred_dates: string;
  num_days: string;
  school_year: string;
  programs: string[];
  grades: string[];
  num_students: string;
  num_groups: string;
  message: string;
  lead_source: string;
  newsletter: boolean;
  privacy: boolean;
}

const STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
];

const SCHOOL_YEARS = ["2025/2026", "2026/2027", "2027/2028", "2028/2029"];

export function LeadForm({ locale }: { locale: Locale }) {
  const l = t[locale];
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [data, setData] = useState<FormData>({
    first_name: "", last_name: "", email: "", phone: "",
    roles: [], school_name: "", street: "", postcode: "", city: "", state: "",
    school_type: "", has_dates: null, preferred_dates: "", num_days: "",
    school_year: "", programs: [], grades: [], num_students: "", num_groups: "",
    message: "", lead_source: "", newsletter: false, privacy: false,
  });

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sendHeight = () => {
      if (formRef.current) {
        const height = formRef.current.scrollHeight + 60;
        window.parent.postMessage({ type: "resize-iframe", height }, "*");
      }
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    if (formRef.current) observer.observe(formRef.current);
    return () => observer.disconnect();
  }, [step, data]);

  const set = (field: keyof FormData, value: unknown) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const toggleArray = (field: "programs" | "grades" | "roles", value: string) => {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const canNext = () => {
    switch (step) {
      case 1: return data.first_name && data.last_name && data.email;
      case 2: return data.roles.length > 0;
      case 3: return data.school_name && data.street && data.postcode && data.city && data.state;
      case 4: return true;
      case 5: return data.programs.length > 0;
      case 6: return data.privacy;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/lead-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      setSubmitted(true);
    } catch {
      alert("Error submitting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#333333" }}>
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF0080]/20">
            <svg className="h-8 w-8 text-[#FF0080]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-3xl font-black text-[#FF0080] uppercase">{l.success_title}</h2>
          <p className="mt-3 text-[#CCCCCC]">{l.success_message}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef} className="flex items-start justify-center px-4 py-8" style={{ backgroundColor: "#333333" }}>
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6 sm:mb-8 flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? "bg-[#FF0080]" : "bg-zinc-600"}`} />
          ))}
        </div>

        {/* Language toggle */}
        <div className="mb-4 sm:mb-6 flex justify-end gap-2">
          <a href="?lang=de" className={`text-xs px-2 py-1 rounded ${locale === "de" ? "bg-[#FF0080] text-[#CCCCCC]" : "text-[#999999] hover:text-[#CCCCCC]"}`}>DE</a>
          <a href="?lang=en" className={`text-xs px-2 py-1 rounded ${locale === "en" ? "bg-[#FF0080] text-[#CCCCCC]" : "text-[#999999] hover:text-[#CCCCCC]"}`}>EN</a>
        </div>

        {/* Step 1: About You */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#FF0080] uppercase" style={{ fontFamily: "Anton, sans-serif" }}>{l.step1_title}</h2>
              <p className="mt-1 text-[#999999]">{l.step1_subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={l.first_name} value={data.first_name} onChange={(v) => set("first_name", v)} required />
              <Input label={l.last_name} value={data.last_name} onChange={(v) => set("last_name", v)} required />
            </div>
            <Input label={l.email} value={data.email} onChange={(v) => set("email", v)} type="email" required />
            <Input label={l.phone} value={data.phone} onChange={(v) => set("phone", v)} type="tel" />
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#FF0080] uppercase" style={{ fontFamily: "Anton, sans-serif" }}>{l.step2_title}</h2>
              <p className="mt-1 text-[#999999]">{l.step2_subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {l.roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleArray("roles", role.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    data.roles.includes(role.value)
                      ? "border-[#FF0080] bg-[#FF0080]/20 text-[#FF0080] font-medium"
                      : "border-zinc-600 text-[#CCCCCC] hover:border-zinc-400"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: School */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#FF0080] uppercase" style={{ fontFamily: "Anton, sans-serif" }}>{l.step3_title}</h2>
              <p className="mt-1 text-[#999999]">{l.step3_subtitle}</p>
            </div>
            <Input label={l.school_name} value={data.school_name} onChange={(v) => set("school_name", v)} required />
            <Input label={l.school_address} value={data.street} onChange={(v) => set("street", v)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="PLZ" value={data.postcode} onChange={(v) => set("postcode", v)} required />
              <Input label={locale === "de" ? "Stadt" : "City"} value={data.city} onChange={(v) => set("city", v)} required />
            </div>
            <Select label={locale === "de" ? "Bundesland" : "State"} value={data.state} onChange={(v) => set("state", v)} options={STATES} required />
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#999999] uppercase tracking-wider">{l.school_type}</label>
              <div className="flex flex-wrap gap-2">
                {l.school_types.slice(0, 8).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => set("school_type", st)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      data.school_type === st
                        ? "border-[#FF0080] bg-[#FF0080]/20 text-[#FF0080] font-medium"
                        : "border-zinc-600 text-[#CCCCCC] hover:border-zinc-400"
                    }`}
                  >
                    {st}
                  </button>
                ))}
                <select
                  value={data.school_type}
                  onChange={(e) => set("school_type", e.target.value)}
                  className="rounded-full border border-zinc-600 bg-transparent px-3 py-1.5 text-xs text-[#CCCCCC]"
                >
                  <option value="">Mehr...</option>
                  {l.school_types.slice(8).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Dates */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#FF0080] uppercase" style={{ fontFamily: "Anton, sans-serif" }}>{l.step4_title}</h2>
              <p className="mt-1 text-[#999999]">{l.step4_subtitle}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => set("has_dates", true)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  data.has_dates === true ? "border-[#FF0080] bg-[#FF0080]/10" : "border-zinc-600 hover:border-zinc-400"
                }`}
              >
                <span className="font-medium text-[#CCCCCC]">{l.has_dates_yes}</span>
              </button>
              <button
                type="button"
                onClick={() => set("has_dates", false)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  data.has_dates === false ? "border-[#FF0080] bg-[#FF0080]/10" : "border-zinc-600 hover:border-zinc-400"
                }`}
              >
                <span className="font-medium text-[#CCCCCC]">{l.has_dates_no}</span>
              </button>
            </div>
            {data.has_dates && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#999999] uppercase tracking-wider">
                    {locale === "de" ? "Von" : "From"} <span className="text-[#FF0080]">*</span>
                  </label>
                  <input
                    type="date"
                    value={data.preferred_dates}
                    onChange={(e) => set("preferred_dates", e.target.value)}
                    className="w-full rounded-none border-0 border-b-2 border-zinc-500 bg-transparent px-0 py-3 text-base text-white focus:border-[#FF0080] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#999999] uppercase tracking-wider">
                    {locale === "de" ? "Bis" : "To"} <span className="text-[#FF0080]">*</span>
                  </label>
                  <input
                    type="date"
                    value={data.num_days}
                    onChange={(e) => set("num_days", e.target.value)}
                    className="w-full rounded-none border-0 border-b-2 border-zinc-500 bg-transparent px-0 py-3 text-base text-white focus:border-[#FF0080] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
            {data.has_dates === false && (
              <div className="space-y-4">
                <Input label={locale === "de" ? "Zeitraum (z.B. Mai-Juni)" : "Timeframe (e.g. May-June)"} value={data.preferred_dates} onChange={(v) => set("preferred_dates", v)} />
                <Select label={l.school_year} value={data.school_year} onChange={(v) => set("school_year", v)} options={SCHOOL_YEARS} />
              </div>
            )}
          </div>
        )}

        {/* Step 5: Project */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#FF0080] uppercase" style={{ fontFamily: "Anton, sans-serif" }}>{l.step5_title}</h2>
              <p className="mt-1 text-[#999999]">{l.step5_subtitle}</p>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {l.programs.map((prog) => (
                <button
                  key={prog.value}
                  type="button"
                  onClick={() => toggleArray("programs", prog.value)}
                  className={`w-full rounded-lg border p-3 text-left transition-all ${
                    data.programs.includes(prog.value)
                      ? "border-[#FF0080] bg-[#FF0080]/10"
                      : "border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  <span className="text-sm font-medium text-white">{prog.value}</span>
                  <span className="mt-0.5 block text-xs text-[#999999]">{prog.desc}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#999999] uppercase tracking-wider">{l.grades}</label>
              <div className="flex flex-wrap gap-2">
                {l.grade_options.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleArray("grades", `Grade ${g}`)}
                    className={`h-9 w-9 rounded-full border text-xs font-medium transition-all ${
                      data.grades.includes(`Grade ${g}`)
                        ? "border-[#FF0080] bg-[#FF0080] text-[#CCCCCC]"
                        : "border-zinc-600 text-[#CCCCCC] hover:border-zinc-400"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label={l.num_students} value={data.num_students} onChange={(v) => set("num_students", v)} type="number" />
              <Input label={l.num_groups} value={data.num_groups} onChange={(v) => set("num_groups", v)} type="number" />
            </div>
            <Textarea label={l.message} value={data.message} onChange={(v) => set("message", v)} />
          </div>
        )}

        {/* Step 6: Final */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl text-[#FF0080] uppercase" style={{ fontFamily: "Anton, sans-serif" }}>{l.step6_title}</h2>
              <p className="mt-1 text-[#999999]">{l.step6_subtitle}</p>
            </div>

            <Select label={l.lead_source} value={data.lead_source} onChange={(v) => set("lead_source", v)} options={l.lead_sources} />

            {/* Newsletter */}
            <div className="rounded-lg border border-zinc-600 p-5">
              <h3 className="text-base font-bold text-[#CCCCCC]">{l.newsletter_title}</h3>
              <p className="mt-1 text-sm text-[#999999]">
                {l.newsletter_desc}{" "}
                <a href="https://interactenglish.de/datenschutz" target="_blank" className="text-[#FF0080] underline">
                  {l.newsletter_link_text}
                </a>.
              </p>
              <label className="mt-3 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.newsletter}
                  onChange={(e) => set("newsletter", e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-500 bg-transparent text-[#FF0080] focus:ring-[#FF0080]"
                />
                <span className="text-sm text-[#CCCCCC]">{l.newsletter_label}</span>
              </label>
            </div>

            {/* Privacy */}
            <div className="rounded-lg border border-zinc-600 p-5">
              <h3 className="text-base font-bold text-[#CCCCCC]">
                {l.privacy_title} <span className="text-[#FF0080]">*</span>
              </h3>
              <p className="mt-1 text-sm text-[#999999]">{l.privacy_desc}</p>
              <label className="mt-3 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.privacy}
                  onChange={(e) => set("privacy", e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-500 bg-transparent text-[#FF0080] focus:ring-[#FF0080]"
                />
                <span className="text-xs font-semibold text-[#999999] uppercase tracking-wider">{l.privacy}</span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 sm:mt-8 flex justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-[#999999] hover:text-[#CCCCCC]"
            >
              {l.back}
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              type="button"
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="rounded-lg bg-[#FF0080] px-8 py-2.5 text-sm font-bold text-[#CCCCCC] uppercase hover:bg-[#FF0080]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {l.next}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="rounded-lg bg-[#FF0080] px-8 py-2.5 text-sm font-bold text-[#CCCCCC] uppercase hover:bg-[#FF0080]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "..." : l.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Form components (dark theme) ──

function Input({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#999999] uppercase tracking-wider">
        {label} {required && <span className="text-[#FF0080]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-none border-0 border-b-2 border-zinc-500 bg-transparent px-0 py-3 text-base text-white placeholder-zinc-500 focus:border-[#FF0080] focus:outline-none transition-colors"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#999999] uppercase tracking-wider">
        {label} {required && <span className="text-[#FF0080]">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-none border-0 border-b-2 border-zinc-500 bg-transparent px-0 py-3 text-base text-[#CCCCCC] focus:border-[#FF0080] focus:outline-none transition-colors"
      >
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#999999] uppercase tracking-wider">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-none border-0 border-b-2 border-zinc-500 bg-transparent px-0 py-3 text-base text-white placeholder-zinc-500 focus:border-[#FF0080] focus:outline-none transition-colors resize-none"
      />
    </div>
  );
}
