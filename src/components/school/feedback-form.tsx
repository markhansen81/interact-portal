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
  status: string;
  teacher_name: string | null;
  teacher_email: string | null;
  feedback_submitted_at: string | null;
}

interface TeamMember {
  id: string;
  ta_id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  photo_url: string | null;
}

interface FeedbackFormProps {
  project: Project;
  token: string;
  teamMembers: TeamMember[];
}

interface TAFeedback {
  ta_id: string;
  ta_name: string;
  rating: number;
  comment: string;
}

interface FormData {
  // Overall
  overall_rating: number;
  what_worked: string;
  what_to_improve: string;
  // TA feedback
  ta_feedback: TAFeedback[];
  // Students
  student_reaction: string;
  student_observations: string;
  // Logistics
  logistics_rating: number;
  communication_rating: number;
  logistics_comments: string;
  // Rebooking
  would_rebook: string;
  rebook_year: string;
  rebook_programs: string[];
}

const PROGRAM_OPTIONS = [
  "Native Speaker Week",
  "Art in Action",
  "Shakespeare Workshop",
  "Summer Camp",
  "Project Week",
  "Custom Programme",
];

const STUDENT_REACTIONS = [
  "Sehr positiv",
  "Positiv",
  "Neutral",
  "Gemischt",
  "Negativ",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getSchoolYearOptions(): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  // If we're past July, the "current" school year is currentYear/currentYear+1
  const startYear = now.getMonth() >= 6 ? currentYear : currentYear - 1;
  return [
    `${startYear}/${startYear + 1}`,
    `${startYear + 1}/${startYear + 2}`,
    `${startYear + 2}/${startYear + 3}`,
  ];
}

function getTADisplayName(m: TeamMember): string {
  return m.preferred_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "Teaching Artist";
}

export function FeedbackForm({ project, token, teamMembers }: FeedbackFormProps) {
  const DRAFT_KEY = `feedback-draft-${project.id}`;
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Current TA index for multi-TA step
  const [currentTAIndex, setCurrentTAIndex] = useState(0);

  const defaultFormData: FormData = {
    overall_rating: 0,
    what_worked: "",
    what_to_improve: "",
    ta_feedback: teamMembers.map((m) => ({
      ta_id: m.ta_id,
      ta_name: getTADisplayName(m),
      rating: 0,
      comment: "",
    })),
    student_reaction: "",
    student_observations: "",
    logistics_rating: 0,
    communication_rating: 0,
    logistics_comments: "",
    would_rebook: "",
    rebook_year: "",
    rebook_programs: [],
  };

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // Restore draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.formData) {
          setFormData((prev) => ({ ...prev, ...draft.formData }));
        }
        if (typeof draft.currentStep === "number" && draft.currentStep > 0) {
          setCurrentStep(draft.currentStep);
        }
        setDraftLoaded(true);
      } catch {
        // ignore corrupt draft
      }
    }
  }, [DRAFT_KEY]);

  // Save draft debounced on every change
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = { formData, currentStep };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      const fade = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(fade);
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, currentStep, DRAFT_KEY]);

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setFormData(defaultFormData);
    setCurrentStep(0);
    setCurrentTAIndex(0);
    setDraftLoaded(false);
  }

  // Build steps array: welcome, overall, ta (one per TA), students, logistics, rebooking, thankyou
  const steps: string[] = [
    "welcome",
    "overall",
    ...(teamMembers.length > 0 ? ["ta"] : []),
    "students",
    "logistics",
    "rebooking",
    "thankyou",
  ];

  const totalSteps = steps.length;
  // For progress, count TA sub-steps too
  const totalProgressSteps = totalSteps + Math.max(0, teamMembers.length - 1);
  const currentProgressStep =
    steps[currentStep] === "ta"
      ? steps.indexOf("ta") + currentTAIndex
      : currentStep > steps.indexOf("ta") && teamMembers.length > 1
      ? currentStep + teamMembers.length - 1
      : currentStep;
  const progress = Math.round(
    (currentProgressStep / (totalProgressSteps - 1)) * 100
  );

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setValidationErrors([]);
    },
    []
  );

  const updateTAFeedback = useCallback(
    (taIndex: number, field: "rating" | "comment", value: number | string) => {
      setFormData((prev) => {
        const ta_feedback = [...prev.ta_feedback];
        ta_feedback[taIndex] = { ...ta_feedback[taIndex], [field]: value };
        return { ...prev, ta_feedback };
      });
      setValidationErrors([]);
    },
    []
  );

  const toggleProgram = useCallback((program: string) => {
    setFormData((prev) => {
      const programs = prev.rebook_programs.includes(program)
        ? prev.rebook_programs.filter((p) => p !== program)
        : [...prev.rebook_programs, program];
      return { ...prev, rebook_programs: programs };
    });
    setValidationErrors([]);
  }, []);

  function validateCurrentStep(): string[] {
    const step = steps[currentStep];
    const errors: string[] = [];

    switch (step) {
      case "overall":
        if (formData.overall_rating === 0)
          errors.push("Bitte geben Sie eine Gesamtbewertung ab.");
        break;
      case "ta":
        if (formData.ta_feedback[currentTAIndex]?.rating === 0)
          errors.push(
            `Bitte bewerten Sie ${formData.ta_feedback[currentTAIndex]?.ta_name}.`
          );
        break;
      case "students":
        if (!formData.student_reaction)
          errors.push("Bitte wählen Sie eine Reaktion der Schüler*innen aus.");
        break;
      case "logistics":
        if (formData.logistics_rating === 0)
          errors.push("Bitte bewerten Sie die Organisation.");
        if (formData.communication_rating === 0)
          errors.push("Bitte bewerten Sie die Kommunikation.");
        break;
      case "rebooking":
        if (!formData.would_rebook)
          errors.push("Bitte beantworten Sie die Frage zur Wiederbuchung.");
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

    // Handle TA sub-steps
    if (steps[currentStep] === "ta" && currentTAIndex < teamMembers.length - 1) {
      setCurrentTAIndex((i) => i + 1);
      setDirection("forward");
      setAnimKey((k) => k + 1);
      return;
    }

    setDirection("forward");
    setAnimKey((k) => k + 1);
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    if (steps[currentStep + 1] === "ta") {
      setCurrentTAIndex(0);
    }
  }

  function goBack() {
    setValidationErrors([]);

    // Handle TA sub-steps going back
    if (steps[currentStep] === "ta" && currentTAIndex > 0) {
      setCurrentTAIndex((i) => i - 1);
      setDirection("back");
      setAnimKey((k) => k + 1);
      return;
    }

    setDirection("back");
    setAnimKey((k) => k + 1);
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);

    // If going back to TA step, show the last TA
    if (steps[prevStep] === "ta") {
      setCurrentTAIndex(teamMembers.length - 1);
    }
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
      const res = await fetch(`/api/school/project/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden des Formulars.");
      }

      localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
      setDirection("forward");
      setAnimKey((k) => k + 1);
      setCurrentStep(totalSteps - 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // If already submitted, show confirmation
  if (project.feedback_submitted_at && !submitted && currentStep === 0) {
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
            Feedback bereits eingereicht
          </h1>
          <p className="mt-3 text-zinc-500">
            Sie haben Ihr Feedback bereits am{" "}
            {formatDate(project.feedback_submitted_at.split("T")[0])}{" "}
            abgegeben. Vielen Dank!
          </p>
          <a
            href={`/school/project/${token}`}
            className="mt-6 inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Zurück zum Projekt
          </a>
        </div>
      </div>
    );
  }

  const stepName = steps[currentStep];
  const isLastContentStep = stepName === "rebooking";

  return (
    <div className="flex min-h-[70vh] flex-col">
      {/* Draft indicator */}
      {stepName !== "welcome" && stepName !== "thankyou" && (
        <div className="flex items-center gap-3 mb-2 min-h-[20px]">
          {draftSaved && (
            <p className="text-xs text-teal-500 animate-pulse">
              Entwurf automatisch gespeichert
            </p>
          )}
          {draftLoaded && (
            <button
              type="button"
              onClick={discardDraft}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Entwurf verwerfen
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {stepName !== "welcome" && stepName !== "thankyou" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Fortschritt
            </span>
            <span className="text-xs font-medium text-teal-600">
              {progress}%
            </span>
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
      {(currentStep > 0 || (stepName === "ta" && currentTAIndex > 0)) &&
        stepName !== "thankyou" && (
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
            Zurück
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
        {stepName === "overall" && (
          <StepOverall formData={formData} updateField={updateField} />
        )}
        {stepName === "ta" && teamMembers.length > 0 && (
          <StepTA
            ta={teamMembers[currentTAIndex]}
            feedback={formData.ta_feedback[currentTAIndex]}
            taIndex={currentTAIndex}
            totalTAs={teamMembers.length}
            updateTAFeedback={updateTAFeedback}
          />
        )}
        {stepName === "students" && (
          <StepStudents formData={formData} updateField={updateField} />
        )}
        {stepName === "logistics" && (
          <StepLogistics formData={formData} updateField={updateField} />
        )}
        {stepName === "rebooking" && (
          <StepRebooking
            formData={formData}
            updateField={updateField}
            toggleProgram={toggleProgram}
          />
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
                "Feedback absenden"
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

// --- Star Rating Component ---

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} Stern${star > 1 ? "e" : ""}`}
        >
          <svg
            className={`h-10 w-10 transition-colors ${
              star <= (hovered || value)
                ? "text-amber-400"
                : "text-zinc-200"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// --- Step Components ---

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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900">
          Projektevaluation
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Wir würden uns über Ihr Feedback freuen!
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
          Feedback starten
        </button>
      </div>
    </div>
  );
}

function StepOverall({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">Gesamtbewertung</h2>
      <p className="mt-2 text-zinc-500">
        Wie zufrieden waren Sie insgesamt mit dem Projekt?
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-zinc-700">
            Gesamtbewertung <span className="text-teal-500">*</span>
          </label>
          <StarRating
            value={formData.overall_rating}
            onChange={(v) => updateField("overall_rating", v)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Was hat besonders gut funktioniert?
          </label>
          <textarea
            value={formData.what_worked}
            onChange={(e) => updateField("what_worked", e.target.value)}
            rows={4}
            placeholder="z.B. Motivation der TAs, kreative Methoden, Begeisterung der Schüler*innen..."
            className="form-input resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Was könnte verbessert werden?
          </label>
          <textarea
            value={formData.what_to_improve}
            onChange={(e) => updateField("what_to_improve", e.target.value)}
            rows={4}
            placeholder="z.B. Zeitplanung, Materialien, Kommunikation..."
            className="form-input resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepTA({
  ta,
  feedback,
  taIndex,
  totalTAs,
  updateTAFeedback,
}: {
  ta: TeamMember;
  feedback: TAFeedback;
  taIndex: number;
  totalTAs: number;
  updateTAFeedback: (
    taIndex: number,
    field: "rating" | "comment",
    value: number | string
  ) => void;
}) {
  const displayName = getTADisplayName(ta);

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Teaching Artists</h2>
        {totalTAs > 1 && (
          <span className="text-sm text-zinc-400">
            {taIndex + 1} von {totalTAs}
          </span>
        )}
      </div>
      <p className="mt-2 text-zinc-500">
        Bewerten Sie die einzelnen Teaching Artists.
      </p>

      <div className="mt-8">
        {/* TA profile card */}
        <div className="mb-8 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5">
          {ta.photo_url ? (
            <img
              src={ta.photo_url}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-600">
              {(ta.first_name?.[0] || "T").toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {displayName}
            </h3>
            <p className="text-sm text-zinc-500 capitalize">{ta.role}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <label className="mb-3 block text-sm font-semibold text-zinc-700">
              Wie zufrieden waren Sie mit {displayName}?{" "}
              <span className="text-teal-500">*</span>
            </label>
            <StarRating
              value={feedback?.rating || 0}
              onChange={(v) => updateTAFeedback(taIndex, "rating", v)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">
              Feedback zu {displayName}
              <span className="ml-2 text-xs font-normal text-zinc-400">
                (optional)
              </span>
            </label>
            <textarea
              value={feedback?.comment || ""}
              onChange={(e) =>
                updateTAFeedback(taIndex, "comment", e.target.value)
              }
              rows={4}
              placeholder={`Anmerkungen zu ${displayName}...`}
              className="form-input resize-none"
            />
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
      <h2 className="text-2xl font-bold text-zinc-900">Schüler*innen</h2>
      <p className="mt-2 text-zinc-500">
        Wie haben die Schüler*innen auf das Projekt reagiert?
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-zinc-700">
            Wie haben die Schüler*innen reagiert?{" "}
            <span className="text-teal-500">*</span>
          </label>
          <div className="space-y-2">
            {STUDENT_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                type="button"
                onClick={() => updateField("student_reaction", reaction)}
                className={`w-full rounded-xl border-2 px-5 py-3 text-left text-sm font-medium transition-all ${
                  formData.student_reaction === reaction
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {reaction}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Besondere Beobachtungen?
            <span className="ml-2 text-xs font-normal text-zinc-400">
              (optional)
            </span>
          </label>
          <textarea
            value={formData.student_observations}
            onChange={(e) =>
              updateField("student_observations", e.target.value)
            }
            rows={4}
            placeholder="z.B. Besonders engagierte Gruppen, überraschende Reaktionen..."
            className="form-input resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepLogistics({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">Logistik</h2>
      <p className="mt-2 text-zinc-500">
        Wie zufrieden waren Sie mit der Organisation und Kommunikation?
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-zinc-700">
            Wie zufrieden waren Sie mit der Organisation?{" "}
            <span className="text-teal-500">*</span>
          </label>
          <StarRating
            value={formData.logistics_rating}
            onChange={(v) => updateField("logistics_rating", v)}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-zinc-700">
            Kommunikation mit InterACT{" "}
            <span className="text-teal-500">*</span>
          </label>
          <StarRating
            value={formData.communication_rating}
            onChange={(v) => updateField("communication_rating", v)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Anmerkungen zur Logistik?
            <span className="ml-2 text-xs font-normal text-zinc-400">
              (optional)
            </span>
          </label>
          <textarea
            value={formData.logistics_comments}
            onChange={(e) =>
              updateField("logistics_comments", e.target.value)
            }
            rows={4}
            placeholder="z.B. Anreise, Raumplanung, Materialen..."
            className="form-input resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepRebooking({
  formData,
  updateField,
  toggleProgram,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  toggleProgram: (program: string) => void;
}) {
  const schoolYears = getSchoolYearOptions();

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-bold text-zinc-900">Wiederbuchung</h2>
      <p className="mt-2 text-zinc-500">
        Würden Sie InterACT wieder buchen?
      </p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-zinc-700">
            Würden Sie InterACT wieder buchen?{" "}
            <span className="text-teal-500">*</span>
          </label>
          <div className="space-y-2">
            {["Ja", "Vielleicht", "Nein"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateField("would_rebook", option)}
                className={`w-full rounded-xl border-2 px-5 py-4 text-left text-base font-medium transition-all ${
                  formData.would_rebook === option
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {formData.would_rebook && formData.would_rebook !== "Nein" && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Für welches Schuljahr?
              </label>
              <select
                value={formData.rebook_year}
                onChange={(e) => updateField("rebook_year", e.target.value)}
                className="form-input"
              >
                <option value="">Bitte wählen...</option>
                {schoolYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-zinc-700">
                Welches Programm interessiert Sie?
              </label>
              <div className="space-y-2">
                {PROGRAM_OPTIONS.map((program) => {
                  const selected = formData.rebook_programs.includes(program);
                  return (
                    <label
                      key={program}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-3 text-sm font-medium transition-all ${
                        selected
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProgram(program)}
                        className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                      />
                      {program}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
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
        <h1 className="text-3xl font-bold text-zinc-900">Vielen Dank für Ihr Feedback!</h1>
        <p className="mt-4 text-lg text-zinc-600">
          Wir freuen uns auf die nächste Zusammenarbeit.
        </p>
        <p className="mt-3 text-zinc-500">
          Ihr Feedback hilft uns, unsere Programme stetig zu verbessern.
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
          Zurück zum Projekt
        </a>
      </div>
    </div>
  );
}
