"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface FormContent {
  form_id: string;
  step_id: string;
  field: string;
  value: string | null;
}

// Default programs — same as onboarding wizard
const PROGRAMS = {
  "Workshops & Weekly Programs": [
    { id: "native_speaker_week", name: "Native Speaker Week", desc: "You'll spend a full week embedded in a school as a native English speaker role model. Each day you lead interactive, creative sessions — think games, storytelling, discussions, and group activities — all designed to get students excited about using English in real life. No textbooks, no grammar drills. Just authentic conversation and cultural exchange. You'll typically work with one or two classes across the week and build real connections with the students." },
    { id: "theatre_week", name: "Theatre Week", desc: "Over five days, you guide a class from first read-through to final performance. Students write, rehearse, and perform a short play entirely in English. You'll direct, coach, and bring out the best in every student — from the confident performers to the shy ones finding their voice. The week ends with a live performance for the school. Theatre experience is a plus, but enthusiasm and the ability to lead a room are what matter most." },
    { id: "art_in_action_week", name: "Art in Action Week", desc: "A week where visual arts and English come together. Students create artwork — painting, sculpture, collage, mixed media — while learning and practising English throughout the process. You'll facilitate creative workshops, guide discussions about art and culture, and help students present their work in English at the end of the week. Great for TAs with a background in visual arts or design." },
    { id: "media_week", name: "Media Week", desc: "Students become journalists, podcasters, and content creators for the week. They produce real media — podcasts, video reports, blog posts, or social media content — all in English. You'll guide them through brainstorming, scripting, production, and editing. The final output is something they can actually share. You should be comfortable with basic media tools and enjoy working with technology." },
    { id: "film_week", name: "Film Week", desc: "The class writes, shoots, and edits a short film in English over five days. You'll lead them through the full filmmaking process — from storyboarding and scriptwriting to directing, acting, and post-production. The week culminates in a screening for the school. Film or video production experience is helpful, but strong facilitation skills and creativity are key." },
    { id: "kids_space_adventure", name: "Kids Space Adventure", desc: "A space-themed English week designed for younger students in grades 1-4 (ages 6-9). Think rocket building, alien storytelling, planet exploration, and cosmic crafts — all in English. The week is high-energy, creative, and playful. You'll need to bring imagination and patience, as these are some of our youngest learners." },
    { id: "monster_parade", name: "Monster Parade", desc: "Another one for the younger students (grades 1-4). Over the week, kids design their own monsters — giving them names, backstories, and personalities — all in English. The week ends with a Monster Parade where they present their creations. It's creative, silly, and incredibly fun." },
    { id: "shakespeare_workshop", name: "Shakespeare Workshop", desc: "Designed for older students (grades 8+), this workshop brings Shakespeare to life through modern performance. Students explore a play — often Romeo & Juliet, A Midsummer Night's Dream, or Macbeth — and adapt scenes for contemporary audiences. Theatre background is strongly preferred." },
    { id: "test_prep_workshop", name: "Test Prep Workshop", desc: "A focused, practical workshop for students preparing for English language exams. You'll lead structured sessions covering speaking, listening, reading, and writing skills. Best suited for TAs with TEFL experience or a strong background in English language teaching." },
    { id: "job_presentation_skills", name: "Job & Presentation Skills", desc: "Older students learn practical English skills for the working world — writing CVs, preparing for job interviews, delivering presentations, and professional communication. Real-world work experience is a huge asset here." },
    { id: "global_speaker_week", name: "Global Speaker Week", desc: "Students explore global issues — climate change, migration, human rights, technology — and develop their public speaking skills in English. The week ends with student presentations to the school." },
    { id: "debate_workshop", name: "Debate Workshop", desc: "Students learn the art of structured debate in English. You'll teach them how to build arguments, use evidence, rebut opponents, and speak persuasively." },
  ],
  "Kulturtag (Culture Day)": [
    { id: "kulturtag_theatre", name: "Kulturtag Theatre", desc: "A single action-packed day of theatre in a school. Students warm up, learn theatre techniques, rehearse scenes, and perform — all in English — within about 4-5 hours." },
    { id: "kulturtag_dance", name: "Kulturtag Dance", desc: "A one-day dance workshop combining movement, rhythm, and English language. Students learn choreography, explore different dance styles, and perform at the end of the day." },
    { id: "kulturtag_music", name: "Kulturtag Music", desc: "A single-day music workshop where students write lyrics, learn rhythms, and perform songs in English." },
    { id: "kulturtag_art", name: "Kulturtag Art", desc: "A one-day visual arts workshop in English. Students create artwork around a theme while practising their English throughout the process." },
  ],
  "Holiday Camps": [
    { id: "camp_general", name: "Camp General", desc: "Our flagship holiday camp format. Over 3-5 days during school holidays, students join an English-immersion camp packed with games, activities, workshops, and adventures." },
    { id: "camp_amazing_me", name: "Camp Amazing Me", desc: "A self-expression and confidence-building camp in English. Students explore identity, creativity, and self-confidence through workshops on storytelling, art, movement, and performance." },
    { id: "camp_media", name: "Camp Media", desc: "A holiday camp focused on media production. Students create real content — short films, podcasts, photo essays — all in English." },
    { id: "camp_music", name: "Camp Music & Songwriting", desc: "Campers write, compose, and record original songs in English over several days." },
    { id: "camp_nature", name: "Camp Nature & Climate", desc: "An outdoor camp combining nature exploration, environmental education, and English language." },
    { id: "camp_theatre", name: "Camp Theatre", desc: "An intensive multi-day theatre camp where students develop and perform a full production in English." },
    { id: "camp_dance", name: "Camp Dance", desc: "A dance-focused holiday camp combining choreography workshops, freestyle sessions, and English communication." },
  ],
  "Class Trips": [
    { id: "trip_theatre", name: "Class Trip Theatre", desc: "A multi-day class trip with a theatre focus. Students travel, stay in homestays, and create a performance." },
    { id: "trip_team_building", name: "Class Trip English Team Building", desc: "An outdoor team-building class trip where everything happens in English — group challenges, trust exercises, problem-solving activities." },
    { id: "trip_media", name: "Class Trip Media", desc: "Students travel and create media content together — documentaries, vlogs, podcasts, or photo stories." },
    { id: "trip_music", name: "Class Trip Music & Songwriting", desc: "A musical class trip where students write and perform original songs in English." },
    { id: "trip_nature", name: "Class Trip Nature & Climate", desc: "An outdoor class trip focused on nature, sustainability, and English." },
    { id: "trip_dance", name: "Class Trip Dance", desc: "A dance-focused class trip with workshops and a final performance." },
  ],
};

const GROUP_COLORS: Record<string, string> = {
  "Workshops & Weekly Programs": "bg-blue-500",
  "Kulturtag (Culture Day)": "bg-purple-500",
  "Holiday Camps": "bg-green-500",
  "Class Trips": "bg-amber-500",
};

export function ProgramFormEditor({ initialContent }: { initialContent: FormContent[] }) {
  const [content, setContent] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const c of initialContent) {
      m.set(`${c.step_id}:${c.field}`, c.value || "");
    }
    return m;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [activeProgram, setActiveProgram] = useState<string | null>(null);

  function getValue(stepId: string, field: string, fallback: string): string {
    return content.get(`${stepId}:${field}`) ?? fallback;
  }

  async function saveField(stepId: string, field: string, value: string) {
    setSaving(`${stepId}:${field}`);
    setContent((prev) => {
      const m = new Map(prev);
      m.set(`${stepId}:${field}`, value);
      return m;
    });

    await fetch("/api/admin/form-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form_id: "programs", step_id: stepId, field, value }),
    });
    setSaving(null);
  }

  // Flatten all programs
  const allPrograms: { id: string; name: string; desc: string; group: string }[] = [];
  for (const [group, items] of Object.entries(PROGRAMS)) {
    for (const prog of items) {
      allPrograms.push({ ...prog, group });
    }
  }

  const selected = activeProgram ? allPrograms.find((p) => p.id === activeProgram) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left — program list */}
      <div className="space-y-4">
        {Object.entries(PROGRAMS).map(([group, items]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${GROUP_COLORS[group] || "bg-zinc-400"}`} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{group}</h3>
            </div>
            <div className="space-y-1">
              {items.map((prog) => {
                const hasCustom = content.has(`${prog.id}:description`) || content.has(`${prog.id}:image_url`);
                return (
                  <button
                    key={prog.id}
                    onClick={() => setActiveProgram(prog.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      activeProgram === prog.id
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate">{getValue(prog.id, "name", prog.name)}</span>
                    {hasCustom && (
                      <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Right — edit panel */}
      <div className="lg:col-span-2">
        {selected ? (
          <ProgramEditPanel
            key={selected.id}
            program={selected}
            getValue={getValue}
            saveField={saveField}
            saving={saving}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-400">Select a program to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramEditPanel({
  program,
  getValue,
  saveField,
  saving,
}: {
  program: { id: string; name: string; desc: string; group: string };
  getValue: (stepId: string, field: string, fallback: string) => string;
  saveField: (stepId: string, field: string, value: string) => Promise<void>;
  saving: string | null;
}) {
  const [name, setName] = useState(getValue(program.id, "name", program.name));
  const [desc, setDesc] = useState(getValue(program.id, "description", program.desc));
  const [imageUrl, setImageUrl] = useState(getValue(program.id, "image_url", ""));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const fileName = `program-images/${program.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("documents").upload(fileName, file);
    if (error) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(data.path);
    const url = urlData.publicUrl;
    setImageUrl(url);
    await saveField(program.id, "image_url", url);
    setUploading(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Preview header */}
      <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              program.group.includes("Workshop") ? "bg-blue-500" :
              program.group.includes("Kultur") ? "bg-purple-500" :
              program.group.includes("Camp") ? "bg-green-500" : "bg-amber-500"
            }`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{program.group}</span>
          </div>
          <span className="text-[10px] text-zinc-400">
            {saving?.startsWith(program.id) ? "Saving..." : "Auto-saves on blur"}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Program Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (name !== program.name) saveField(program.id, "name", name); }}
            className="block w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-lg font-semibold text-zinc-900 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100"
          />
        </div>

        {/* Image */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Program Image</label>
          {imageUrl ? (
            <div className="relative group">
              <img src={imageUrl} alt={name} className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-sm font-medium text-white">Replace image</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 hover:border-zinc-400 transition-colors dark:border-zinc-700"
            >
              {uploading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
              ) : (
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
                  </svg>
                  <p className="mt-2 text-xs text-zinc-400">Click to upload image</p>
                </div>
              )}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => { if (desc !== program.desc) saveField(program.id, "description", desc); }}
            rows={8}
            className="block w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-700 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
          />
          <p className="mt-1 text-[11px] text-zinc-400">{desc.length} characters</p>
        </div>

        {/* Preview */}
        <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">TA Preview</p>
          <div className="rounded-xl bg-zinc-50 p-5 dark:bg-zinc-800/50">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{name}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{desc}</p>
            {imageUrl && (
              <img src={imageUrl} alt={name} className="mt-4 w-full h-32 object-cover rounded-lg" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
