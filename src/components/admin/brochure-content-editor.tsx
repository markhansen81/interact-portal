"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface Section {
  id: string;
  title: string;
  content: Record<string, unknown>;
  updated_at: string;
}

interface Props {
  sections: Section[];
}

const inputCls =
  "w-full border border-neutral-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-black focus:ring-0";
const textareaCls = `${inputCls} min-h-[80px]`;

/* ---------- per-section editors ---------- */

function UeberUnsEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = content as {
    paragraph_1?: string;
    paragraph_2?: string;
    paragraph_3?: string;
    callout?: string;
  };
  return (
    <div className="space-y-4">
      <Field label="Paragraph 1">
        <textarea
          className={textareaCls}
          value={c.paragraph_1 ?? ""}
          onChange={(e) => onChange({ ...c, paragraph_1: e.target.value })}
        />
      </Field>
      <Field label="Paragraph 2">
        <textarea
          className={textareaCls}
          value={c.paragraph_2 ?? ""}
          onChange={(e) => onChange({ ...c, paragraph_2: e.target.value })}
        />
      </Field>
      <Field label="Paragraph 3">
        <textarea
          className={textareaCls}
          value={c.paragraph_3 ?? ""}
          onChange={(e) => onChange({ ...c, paragraph_3: e.target.value })}
        />
      </Field>
      <Field label="Callout text">
        <input
          className={inputCls}
          value={c.callout ?? ""}
          onChange={(e) => onChange({ ...c, callout: e.target.value })}
        />
      </Field>
    </div>
  );
}

function MissionEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = content as { mission_text?: string };
  return (
    <Field label="Mission text">
      <textarea
        className={textareaCls}
        rows={6}
        value={c.mission_text ?? ""}
        onChange={(e) => onChange({ ...c, mission_text: e.target.value })}
      />
    </Field>
  );
}

function TeamEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = content as { members?: { name: string; role: string }[] };
  const members = c.members ?? [];

  const update = (idx: number, key: "name" | "role", val: string) => {
    const next = [...members];
    next[idx] = { ...next[idx], [key]: val };
    onChange({ ...c, members: next });
  };
  const add = () => onChange({ ...c, members: [...members, { name: "", role: "" }] });
  const remove = (idx: number) =>
    onChange({ ...c, members: members.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {members.map((m, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <input
              className={inputCls}
              placeholder="Name"
              value={m.name}
              onChange={(e) => update(i, "name", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Role"
              value={m.role}
              onChange={(e) => update(i, "role", e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mt-2 text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        Add Member
      </Button>
    </div>
  );
}

function NativeSpeakerEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = content as {
    intro_text?: string;
    countries?: { name: string; count: number }[];
    teaching_artists?: string[];
  };
  const countries = c.countries ?? [];
  const artists = c.teaching_artists ?? [];

  const updateCountry = (idx: number, key: "name" | "count", val: string | number) => {
    const next = [...countries];
    next[idx] = { ...next[idx], [key]: val };
    onChange({ ...c, countries: next });
  };
  const addCountry = () =>
    onChange({ ...c, countries: [...countries, { name: "", count: 0 }] });
  const removeCountry = (idx: number) =>
    onChange({ ...c, countries: countries.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <Field label="Intro text">
        <textarea
          className={textareaCls}
          value={c.intro_text ?? ""}
          onChange={(e) => onChange({ ...c, intro_text: e.target.value })}
        />
      </Field>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Countries</label>
        <div className="space-y-2">
          {countries.map((ct, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                className={inputCls}
                placeholder="Country"
                value={ct.name}
                onChange={(e) => updateCountry(i, "name", e.target.value)}
              />
              <input
                className={`${inputCls} w-24`}
                type="number"
                placeholder="Count"
                value={ct.count}
                onChange={(e) => updateCountry(i, "count", parseInt(e.target.value) || 0)}
              />
              <button
                type="button"
                onClick={() => removeCountry(i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={addCountry}
        >
          Add Country
        </Button>
      </div>

      <Field label="Teaching Artists (comma-separated)">
        <textarea
          className={textareaCls}
          value={artists.join(", ")}
          onChange={(e) =>
            onChange({
              ...c,
              teaching_artists: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
    </div>
  );
}

function EinflussEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = content as {
    testimonials?: { quote: string; author: string }[];
    stats?: { value: string; label: string }[];
  };
  const testimonials = c.testimonials ?? [];
  const stats = c.stats ?? [];

  const updateTestimonial = (idx: number, key: "quote" | "author", val: string) => {
    const next = [...testimonials];
    next[idx] = { ...next[idx], [key]: val };
    onChange({ ...c, testimonials: next });
  };
  const addTestimonial = () =>
    onChange({ ...c, testimonials: [...testimonials, { quote: "", author: "" }] });
  const removeTestimonial = (idx: number) =>
    onChange({ ...c, testimonials: testimonials.filter((_, i) => i !== idx) });

  const updateStat = (idx: number, key: "value" | "label", val: string) => {
    const next = [...stats];
    next[idx] = { ...next[idx], [key]: val };
    onChange({ ...c, stats: next });
  };
  const addStat = () =>
    onChange({ ...c, stats: [...stats, { value: "", label: "" }] });
  const removeStat = (idx: number) =>
    onChange({ ...c, stats: stats.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Testimonials
        </label>
        <div className="space-y-3">
          {testimonials.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <textarea
                  className={textareaCls}
                  placeholder="Quote"
                  value={t.quote}
                  onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Author"
                  value={t.author}
                  onChange={(e) => updateTestimonial(i, "author", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeTestimonial(i)}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={addTestimonial}
        >
          Add Testimonial
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Stats</label>
        <div className="space-y-2">
          {stats.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <input
                  className={inputCls}
                  placeholder="Value (e.g. 500+)"
                  value={s.value}
                  onChange={(e) => updateStat(i, "value", e.target.value)}
                />
                <textarea
                  className={textareaCls}
                  placeholder="Label"
                  value={s.label}
                  onChange={(e) => updateStat(i, "label", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeStat(i)}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={addStat}
        >
          Add Stat
        </Button>
      </div>
    </div>
  );
}

/* ---------- shared field wrapper ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ---------- section card ---------- */

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<Record<string, unknown>>(
    section.content ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/offers/content/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const editor = () => {
    switch (section.id) {
      case "ueber_uns":
        return <UeberUnsEditor content={content} onChange={setContent} />;
      case "mission":
        return <MissionEditor content={content} onChange={setContent} />;
      case "team":
        return <TeamEditor content={content} onChange={setContent} />;
      case "native_speaker":
        return <NativeSpeakerEditor content={content} onChange={setContent} />;
      case "einfluss":
        return <EinflussEditor content={content} onChange={setContent} />;
      default:
        return (
          <p className="text-sm text-neutral-500">
            Unknown section type: {section.id}
          </p>
        );
    }
  };

  return (
    <div className="border border-neutral-200 rounded-sm bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {section.title}
          </h3>
          {section.updated_at && (
            <p className="text-xs text-neutral-400 mt-0.5">
              Last updated{" "}
              {new Date(section.updated_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-neutral-100">
          {editor()}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Saved &#10003;
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- main component ---------- */

export function BrochureContentEditor({ sections }: Props) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <SectionCard key={s.id} section={s} />
      ))}
      {sections.length === 0 && (
        <p className="text-sm text-neutral-500">
          No brochure content sections found. Add rows to the
          offer_brochure_content table to get started.
        </p>
      )}
    </div>
  );
}
