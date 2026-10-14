"use client";

import { useState, useEffect, useCallback } from "react";

interface Project {
  id: string;
  name: string;
  school: string | null;
  program_type: string | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  teacher_name: string | null;
  teacher_email: string | null;
  info_pack_submitted_at: string | null;
}

interface InfoPackFormProps {
  project: Project;
  token: string;
}

interface SchedulePeriod {
  start: string;
  end: string;
}

interface FormData {
  // Contact
  contact_name: string;
  email: string;
  phone: string;
  deputy_name: string;
  deputy_contact: string;
  // Students
  grade_level: string;
  language_level: string;
  num_groups: string;
  students_per_group: string;
  // Schedule
  periods: SchedulePeriod[];
  first_meeting_time: string;
  first_meeting_location: string;
  first_meeting_teacher: string;
  // Modules
  modules: string[];
  art_choice: string;
  play_name: string;
  // Presentation
  presentation: string;
  presentation_details: string;
  // Meals & Logistics
  lunch: string;
  lunch_cost: string;
  phone_allowed: boolean;
  certificates: string;
  // Additional
  difficulties: string;
  comments: string;
  privacy_consent: boolean;
}

const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const MODULE_OPTIONS = [
  "Drama & Theatre",
  "Music & Songwriting",
  "Film & Media",
  "Creative Writing",
  "Visual Arts",
  "Dance & Movement",
  "Public Speaking & Debate",
  "Storytelling",
  "Improvisation",
  "Photography",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function InfoPackForm({ project, token }: InfoPackFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const needsModuleStep =
    project.program_type === "Native Speaker Week" ||
    project.program_type === "Art in Action" ||
    project.program_type === "Shakespeare Workshop";

  const [formData, setFormData] = useState<FormData>({
    contact_name: project.teacher_name || "",
    email: project.teacher_email || "",
    phone: "",
    deputy_name: "",
    deputy_contact: "",
    grade_level: "",
    language_level: "",
    num_groups: "",
    students_per_group: "",
    periods: Array.from({ length: 7 }, () => ({ start: "", end: "" })),
    first_meeting_time: "",
    first_meeting_location: "",
    first_meeting_teacher: "",
    modules: [],
    art_choice: "",
    play_name: "",
    presentation: "",
    presentation_details: "",
    lunch: "",
    lunch_cost: "",
    phone_allowed: false,
    certificates: "",
    difficulties: "",
    comments: "",
    privacy_consent: false,
  });

  // Build steps array dynamically
  const steps = [
    "welcome",
    "contact",
    "students",
    "schedule",
    ...(needsModuleStep ? ["modules"] : []),
    "presentation",
    "meals",
    "additional",
    "thankyou",
  ];

  const totalSteps = steps.length;
  const progress = Math.round((currentStep / (totalSteps - 1)) * 100);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setValidationErrors([]);
    },
    []
  );

  const updatePeriod = useCallback(
    (index: number, field: "start" | "end", value: string) => {
      setFormData((prev) => {
        const periods = [...prev.periods];
        periods[index] = { ...periods[index], [field]: value };
        return { ...prev, periods };
      });
      setValidationErrors([]);
    },
    []
  );

  const toggleModule = useCallback((mod: string) => {
    setFormData((prev) => {
      const modules = prev.modules.includes(mod)
        ? prev.modules.filter((m) => m !== mod)
        : prev.modules.length < 3
        ? [...prev.modules, mod]
        : prev.modules;
      return { ...prev, modules };
    });
    setValidationErrors([]);
  }, []);

  function validateCurrentStep(): string[] {
    const step = steps[currentStep];
    const errors: string[] = [];

    switch (step) {
      case "contact":
        if (!formData.contact_name.trim())
          errors.push("Bitte geben Sie den Namen der Ansprechperson ein.");
        if (!formData.email.trim())
          errors.push("Bitte geben Sie eine E-Mail-Adresse ein.");
        if (!formData.phone.trim())
          errors.push("Bitte geben Sie eine Telefonnummer ein.");
        break;
      case "students":
        if (!formData.grade_level.trim())
          errors.push("Bitte geben Sie die Jahrgangsstufe ein.");
        if (!formData.language_level)
          errors.push("Bitte wahlen Sie das Sprachniveau aus.");
        if (!formData.num_groups)
          errors.push("Bitte geben Sie die Anzahl der Gruppen ein.");
        if (!formData.students_per_group)
          errors.push("Bitte geben Sie die Anzahl der Schuler pro Gruppe ein.");
        break;
      case "schedule": {
        // First 5 periods required
        for (let i = 0; i < 5; i++) {
          if (!formData.periods[i].start || !formData.periods[i].end) {
            errors.push(`Bitte geben Sie die Zeiten fur Stunde ${i + 1} ein.`);
            break;
          }
        }
        if (!formData.first_meeting_time.trim())
          errors.push("Bitte geben Sie die Zeit des ersten Treffens ein.");
        if (!formData.first_meeting_location.trim())
          errors.push("Bitte geben Sie den Ort des ersten Treffens ein.");
        if (!formData.first_meeting_teacher.trim())
          errors.push(
            "Bitte geben Sie den Namen der Lehrkraft fur das erste Treffen ein."
          );
        break;
      }
      case "modules":
        if (project.program_type === "Native Speaker Week") {
          if (formData.modules.length < 3)
            errors.push("Bitte wahlen Sie 3 Module aus.");
        }
        if (project.program_type === "Art in Action") {
          if (!formData.art_choice)
            errors.push("Bitte wahlen Sie analog oder digital.");
        }
        if (project.program_type === "Shakespeare Workshop") {
          if (!formData.play_name.trim())
            errors.push("Bitte geben Sie den Namen des Stucks ein.");
        }
        break;
      case "presentation":
        if (!formData.presentation)
          errors.push("Bitte beantworten Sie die Frage zur Abschlussprasentation.");
        if (formData.presentation && formData.presentation !== "nein" && !formData.presentation_details.trim())
          errors.push("Bitte geben Sie weitere Details ein.");
        break;
      case "meals":
        if (!formData.lunch)
          errors.push("Bitte beantworten Sie die Frage zum Mittagessen.");
        if (!formData.certificates)
          errors.push("Bitte beantworten Sie die Frage zu Zertifikaten.");
        break;
      case "additional":
        if (!formData.privacy_consent)
          errors.push(
            "Bitte stimmen Sie der Datenschutzerklarung zu, um fortzufahren."
          );
        break;
    }
    return errors;
  }

  function goNext() {
    const errors = validateCurrentStep();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setDirection("forward");
    setAnimKey((k) => k + 1);
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function goBack() {
    setValidationErrors([]);
    setDirection("back");
    setAnimKey((k) => k + 1);
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const errors = validateCurrentStep();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/school/project/${token}/info-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden des Formulars.");
      }

      setSubmitted(true);
      setDirection("forward");
      setAnimKey((k) => k + 1);
      setCurrentStep(totalSteps - 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Enter key to advance
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        const step = steps[currentStep];
        // Don't advance on enter for textareas or the last step
        if (step === "thankyou") return;
        if (step === "additional") return; // has textareas
        if (step === "welcome") {
          e.preventDefault();
          goNext();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // If already submitted, show thank you
  if (project.info_pack_submitted_at && !submitted && currentStep === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-teal-100">
            <svg
              className="h-8 w-8 text-teal-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Formular bereits eingereicht
          </h1>
          <p className="mt-3 text-zinc-500">
            Sie haben das Info-Formular bereits am{" "}
            {formatDate(project.info_pack_submitted_at.split("T")[0])}{" "}
            ausgefullt. Falls Sie Anderungen vornehmen mochten, kontaktieren Sie
            uns bitte direkt.
          </p>
          <a
            href={`/school/project/${token}`}
            className="mt-6 inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Zuruck zum Projekt
          </a>
        </div>
      </div>
    );
  }

  const stepName = steps[currentStep];
  const isLastContentStep = stepName === "additional";

  return (
    <div className="flex min-h-[70vh] flex-col">
      {/* Progress bar */}
      {stepName !== "welcome" && stepName !== "thankyou" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Fortschritt
            </span>
            <span className="text-xs font-medium text-teal-600">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Back button */}
      {currentStep > 0 && stepName !== "thankyou" && (
        <button
          onClick={goBack}
          className="mb-6 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors self-start"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Zuruck
        </button>
      )}

      {/* Step content */}
      <div
        key={animKey}
        className={`flex-1 ${
          direction === "forward"
            ? "animate-slide-in-right"
            : "animate-slide-in-left"
        }`}
      >
        {stepName === "welcome" && (
          <StepWelcome project={project} onContinue={goNext} />
        )}
        {stepName === "contact" && (
          <StepContact formData={formData} updateField={updateField} />
        )}
        {stepName === "students" && (
          <StepStudents formData={formData} updateField={updateField} />
        )}
        {stepName === "schedule" && (
          <StepSchedule
            formData={formData}
            updateField={updateField}
            updatePeriod={updatePeriod}
          />
        )}
        {stepName === "modules" && (
          <StepModules
            formData={formData}
            updateField={updateField}
            toggleModule={toggleModule}
            programType={project.program_type || ""}
          />
        )}
        {stepName === "presentation" && (
          <StepPresentation formData={formData} updateField={updateField} />
        )}
        {stepName === "meals" && (
          <StepMeals formData={formData} updateField={updateField} />
        )}
        {stepName === "additional" && (
          <StepAdditional formData={formData} updateField={updateField} />
        )}
        {stepName === "thankyou" && <StepThankYou token={token} />}
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          {validationErrors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Submit error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Continue / Submit button */}
      {stepName !== "welcome" && stepName !== "thankyou" && (
        <div className="mt-8 flex justify-end">
          {isLastContentStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Wird gesendet...
                </span>
              ) : (
                "Formular absenden"
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              Weiter
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function StepWelcome({
  project,
  onContinue,
}: {
  project: Project;
  onContinue: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-teal-100">
          <svg
            className="h-8 w-8 text-teal-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">Willkommen!</h1>
        <p className="mt-4 text-lg text-zinc-600">
          Bitte fullen Sie das Info-Formular fur Ihr Projekt aus.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-left">
          <h2 className="text-lg font-semibold text-zinc-900">
            {project.name}
          </h2>
          <div className="mt-2 space-y-1 text-sm text-zinc-500">
            {project.school && <p>Schule: {project.school}</p>}
            {project.program_type && <p>Programm: {project.program_type}</p>}
            {project.start_date && project.end_date && (
              <p>
                Zeitraum: {formatDate(project.start_date)} &mdash;{" "}
                {formatDate(project.end_date)}
              </p>
            )}
            {project.days && (
              <p>
                Dauer: {project.days} Tag{project.days > 1 ? "e" : ""}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onContinue}
          className="mt-8 rounded-xl bg-teal-600 px-10 py-4 text-lg font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
        >
          Los geht&apos;s
        </button>
      </div>
    </div>
  );
}

function StepContact({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">Kontaktinformationen</h2>
      <p className="mt-2 text-zinc-500">
        Wer ist die Ansprechperson fur dieses Projekt?
      </p>

      <div className="mt-8 space-y-5">
        <FormField label="Ansprechpartner*in" required>
          <input
            type="text"
            value={formData.contact_name}
            onChange={(e) => updateField("contact_name", e.target.value)}
            placeholder="Vor- und Nachname"
            className="form-input"
          />
        </FormField>

        <FormField label="E-Mail" required>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="email@schule.de"
            className="form-input"
          />
        </FormField>

        <FormField label="Telefon" required>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+49 ..."
            className="form-input"
          />
        </FormField>

        <div className="border-t border-zinc-100 pt-5">
          <p className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wide">
            Stellvertretung (optional)
          </p>

          <div className="space-y-5">
            <FormField label="Stellvertreter*in">
              <input
                type="text"
                value={formData.deputy_name}
                onChange={(e) => updateField("deputy_name", e.target.value)}
                placeholder="Vor- und Nachname"
                className="form-input"
              />
            </FormField>

            <FormField label="E-Mail / Telefon Stellvertretung">
              <input
                type="text"
                value={formData.deputy_contact}
                onChange={(e) => updateField("deputy_contact", e.target.value)}
                placeholder="E-Mail oder Telefonnummer"
                className="form-input"
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepStudents({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">
        Schuler*innen-Informationen
      </h2>
      <p className="mt-2 text-zinc-500">
        Erzahlen Sie uns von den teilnehmenden Schuler*innen.
      </p>

      <div className="mt-8 space-y-5">
        <FormField label="Jahrgangsstufe" required>
          <input
            type="text"
            value={formData.grade_level}
            onChange={(e) => updateField("grade_level", e.target.value)}
            placeholder="z.B. 9. Klasse, Oberstufe"
            className="form-input"
          />
        </FormField>

        <FormField label="Durchschnittliches Sprachniveau" required>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => updateField("language_level", level)}
                className={`rounded-lg border-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                  formData.language_level === level
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Anzahl der Gruppen" required>
            <input
              type="number"
              min="1"
              value={formData.num_groups}
              onChange={(e) => updateField("num_groups", e.target.value)}
              placeholder="z.B. 4"
              className="form-input"
            />
          </FormField>

          <FormField label="Schuler*innen pro Gruppe" required>
            <input
              type="number"
              min="1"
              value={formData.students_per_group}
              onChange={(e) =>
                updateField("students_per_group", e.target.value)
              }
              placeholder="z.B. 25"
              className="form-input"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

function StepSchedule({
  formData,
  updateField,
  updatePeriod,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  updatePeriod: (index: number, field: "start" | "end", value: string) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">Stundenplan</h2>
      <p className="mt-2 text-zinc-500">
        Bitte geben Sie die Unterrichtszeiten ein. Die ersten 5 Stunden sind
        Pflicht.
      </p>

      <div className="mt-8 space-y-3">
        {formData.periods.map((period, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className={`w-24 text-sm font-medium ${
                i < 5 ? "text-zinc-700" : "text-zinc-400"
              }`}
            >
              {i + 1}. Stunde{i < 5 ? " *" : ""}
            </span>
            <input
              type="time"
              value={period.start}
              onChange={(e) => updatePeriod(i, "start", e.target.value)}
              className="form-input flex-1"
            />
            <span className="text-zinc-400">&mdash;</span>
            <input
              type="time"
              value={period.end}
              onChange={(e) => updatePeriod(i, "end", e.target.value)}
              className="form-input flex-1"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-zinc-100 pt-6">
        <h3 className="text-lg font-semibold text-zinc-900">Erstes Treffen</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Wo und wann treffen sich die Teaching Artists am ersten Tag?
        </p>

        <div className="mt-4 space-y-4">
          <FormField label="Uhrzeit" required>
            <input
              type="time"
              value={formData.first_meeting_time}
              onChange={(e) =>
                updateField("first_meeting_time", e.target.value)
              }
              className="form-input"
            />
          </FormField>

          <FormField label="Ort / Raum" required>
            <input
              type="text"
              value={formData.first_meeting_location}
              onChange={(e) =>
                updateField("first_meeting_location", e.target.value)
              }
              placeholder="z.B. Lehrerzimmer, Raum 203"
              className="form-input"
            />
          </FormField>

          <FormField label="Name der Lehrkraft vor Ort" required>
            <input
              type="text"
              value={formData.first_meeting_teacher}
              onChange={(e) =>
                updateField("first_meeting_teacher", e.target.value)
              }
              placeholder="Wer empfangt die TAs?"
              className="form-input"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

function StepModules({
  formData,
  updateField,
  toggleModule,
  programType,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  toggleModule: (mod: string) => void;
  programType: string;
}) {
  if (programType === "Native Speaker Week") {
    return (
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold text-zinc-900">Module wahlen</h2>
        <p className="mt-2 text-zinc-500">
          Bitte wahlen Sie genau 3 Module fur Ihre Native Speaker Week.
        </p>
        <p className="mt-1 text-sm text-teal-600 font-medium">
          {formData.modules.length}/3 ausgewahlt
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {MODULE_OPTIONS.map((mod) => {
            const selected = formData.modules.includes(mod);
            const disabled = !selected && formData.modules.length >= 3;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => toggleModule(mod)}
                disabled={disabled}
                className={`rounded-xl border-2 p-4 text-left text-sm font-medium transition-all ${
                  selected
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : disabled
                    ? "border-zinc-100 text-zinc-300 cursor-not-allowed"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  {selected && (
                    <svg
                      className="h-4 w-4 text-teal-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {mod}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (programType === "Art in Action") {
    return (
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold text-zinc-900">Art in Action</h2>
        <p className="mt-2 text-zinc-500">
          Mochten Sie die analoge oder digitale Variante?
        </p>

        <div className="mt-8 flex gap-4">
          {["analog", "digital"].map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => updateField("art_choice", choice)}
              className={`flex-1 rounded-xl border-2 p-6 text-center text-lg font-semibold capitalize transition-all ${
                formData.art_choice === choice
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {choice === "analog" ? "Analog" : "Digital"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (programType === "Shakespeare Workshop") {
    return (
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold text-zinc-900">
          Shakespeare Workshop
        </h2>
        <p className="mt-2 text-zinc-500">
          Welches Stuck soll behandelt werden?
        </p>

        <div className="mt-8">
          <FormField label="Name des Stucks" required>
            <input
              type="text"
              value={formData.play_name}
              onChange={(e) => updateField("play_name", e.target.value)}
              placeholder="z.B. Romeo and Juliet, A Midsummer Night's Dream"
              className="form-input"
            />
          </FormField>
        </div>
      </div>
    );
  }

  return null;
}

function StepPresentation({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">
        Abschlussprasentation
      </h2>
      <p className="mt-2 text-zinc-500">
        Soll es am Ende der Woche eine Prasentation geben?
      </p>

      <div className="mt-8 space-y-3">
        {[
          { value: "ja", label: "Ja" },
          { value: "nein", label: "Nein" },
          { value: "sonstiges", label: "Sonstiges" },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              updateField("presentation", value);
              updateField("presentation_details", "");
            }}
            className={`w-full rounded-xl border-2 px-5 py-4 text-left text-base font-medium transition-all ${
              formData.presentation === value
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {formData.presentation === "ja" && (
        <div className="mt-6">
          <FormField label="Zeit und Ort der Prasentation" required>
            <input
              type="text"
              value={formData.presentation_details}
              onChange={(e) =>
                updateField("presentation_details", e.target.value)
              }
              placeholder="z.B. Freitag 14:00, Aula"
              className="form-input"
            />
          </FormField>
        </div>
      )}

      {formData.presentation === "nein" && (
        <div className="mt-6">
          <FormField label="Warum nicht?" required>
            <input
              type="text"
              value={formData.presentation_details}
              onChange={(e) =>
                updateField("presentation_details", e.target.value)
              }
              placeholder="Begrundung"
              className="form-input"
            />
          </FormField>
        </div>
      )}

      {formData.presentation === "sonstiges" && (
        <div className="mt-6">
          <FormField label="Bitte erklaren Sie" required>
            <input
              type="text"
              value={formData.presentation_details}
              onChange={(e) =>
                updateField("presentation_details", e.target.value)
              }
              placeholder="Ihre Vorstellung..."
              className="form-input"
            />
          </FormField>
        </div>
      )}
    </div>
  );
}

function StepMeals({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">
        Verpflegung &amp; Logistik
      </h2>
      <p className="mt-2 text-zinc-500">
        Einige praktische Fragen zum Ablauf.
      </p>

      <div className="mt-8 space-y-8">
        {/* Lunch */}
        <div>
          <p className="text-base font-semibold text-zinc-800">
            Gibt es ein Mittagessen fur die Teaching Artists?
          </p>
          <div className="mt-3 space-y-2">
            {[
              { value: "ja", label: "Ja" },
              { value: "nein", label: "Nein" },
              { value: "undecided", label: "Noch nicht entschieden" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  updateField("lunch", value);
                  if (value !== "ja") updateField("lunch_cost", "");
                }}
                className={`w-full rounded-xl border-2 px-5 py-3 text-left text-sm font-medium transition-all ${
                  formData.lunch === value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {formData.lunch === "ja" && (
            <div className="mt-4">
              <FormField label="Kosten pro Mahlzeit">
                <input
                  type="text"
                  value={formData.lunch_cost}
                  onChange={(e) => updateField("lunch_cost", e.target.value)}
                  placeholder="z.B. 4,50 EUR"
                  className="form-input"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Phone policy */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.phone_allowed}
              onChange={(e) => updateField("phone_allowed", e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-base font-semibold text-zinc-800">
                Handynutzung erlaubt
              </span>
              <p className="text-sm text-zinc-500 mt-0.5">
                Durfen die Schuler*innen wahrend der Workshops ihre Handys
                benutzen? (z.B. fur Recherche, Filmaufnahmen)
              </p>
            </div>
          </label>
        </div>

        {/* Certificates */}
        <div>
          <p className="text-base font-semibold text-zinc-800">
            Sollen die Schuler*innen Zertifikate erhalten?
          </p>
          <div className="mt-3 space-y-2">
            {[
              { value: "ja", label: "Ja" },
              { value: "nein", label: "Nein" },
              { value: "later", label: "Entscheiden wir spater" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateField("certificates", value)}
                className={`w-full rounded-xl border-2 px-5 py-3 text-left text-sm font-medium transition-all ${
                  formData.certificates === value
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepAdditional({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">
        Zusatzliche Informationen
      </h2>
      <p className="mt-2 text-zinc-500">Fast geschafft! Noch ein paar letzte Fragen.</p>

      <div className="mt-8 space-y-6">
        <FormField label="Mogliche Schwierigkeiten">
          <textarea
            value={formData.difficulties}
            onChange={(e) => updateField("difficulties", e.target.value)}
            rows={3}
            placeholder="z.B. Klausuren, Wandertage, Stundenplanabweichungen..."
            className="form-input resize-none"
          />
        </FormField>

        <FormField label="Kommentare / Fragen">
          <textarea
            value={formData.comments}
            onChange={(e) => updateField("comments", e.target.value)}
            rows={3}
            placeholder="Haben Sie noch Fragen oder Anmerkungen?"
            className="form-input resize-none"
          />
        </FormField>

        <div className="border-t border-zinc-100 pt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.privacy_consent}
              onChange={(e) =>
                updateField("privacy_consent", e.target.checked)
              }
              className="mt-1 h-5 w-5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-sm font-semibold text-zinc-800">
                Datenschutz *
              </span>
              <p className="text-sm text-zinc-500 mt-0.5">
                Ich stimme der Verarbeitung meiner Daten gema&szlig; der
                Datenschutzerklarung von InterACT English zu.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function StepThankYou({ token }: { token: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-teal-100">
          <svg
            className="h-10 w-10 text-teal-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">Vielen Dank!</h1>
        <p className="mt-4 text-lg text-zinc-600">
          Ihr Formular wurde erfolgreich ubermittelt.
        </p>
        <p className="mt-3 text-zinc-500">
          Nicole wird sich in den nachsten 2-3 Wochen mit allen weiteren
          Informationen bei Ihnen melden.
        </p>
        <a
          href={`/school/project/${token}`}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Zuruck zum Projekt
        </a>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-700">
        {label}
        {required && <span className="ml-1 text-teal-500">*</span>}
      </label>
      {children}
    </div>
  );
}
