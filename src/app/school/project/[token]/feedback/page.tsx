import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackForm } from "@/components/school/feedback-form";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const adminClient = createAdminClient();

  // Look up project by teacher_token
  const { data: project } = await adminClient
    .from("projects")
    .select(
      "id, name, school, program_type, start_date, end_date, days, status, teacher_name, teacher_email, feedback_submitted_at"
    )
    .eq("teacher_token", token)
    .single();

  if (!project) notFound();

  // Only show feedback form for active or completed projects
  if (project.status === "upcoming") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-neutral-100">
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Feedback noch nicht verfügbar
          </h1>
          <p className="mt-3 text-neutral-500">
            Das Feedbackformular wird nach Projektbeginn freigeschaltet.
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

  // Fetch team members with profile data for TA rating steps
  const { data: teamData } = await adminClient
    .from("project_tas")
    .select(
      "id, ta_id, role, profiles!project_tas_ta_id_fkey(id, first_name, last_name, preferred_name, photo_url)"
    )
    .eq("project_id", project.id);

  const teamMembers = (teamData || []).map((t) => {
    const p = t.profiles as unknown as Record<string, unknown> | null;
    return {
      id: t.id,
      ta_id: t.ta_id,
      role: t.role,
      first_name: (p?.first_name as string | null) || null,
      last_name: (p?.last_name as string | null) || null,
      preferred_name: (p?.preferred_name as string | null) || null,
      photo_url: (p?.photo_url as string | null) || null,
    };
  });

  return (
    <FeedbackForm
      project={project}
      token={token}
      teamMembers={teamMembers}
    />
  );
}
