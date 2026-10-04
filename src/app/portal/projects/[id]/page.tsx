import { redirect, notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAProjectView } from "@/components/portal/ta-project-view";

export default async function TAProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Check access via projects.ta_id or project_tas
  let project = null;
  const { data: directProject } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("ta_id", profile.id)
    .single();

  if (directProject) {
    project = directProject;
  } else {
    // Check via project_tas
    const { data: taLink } = await adminClient
      .from("project_tas")
      .select("id")
      .eq("project_id", id)
      .eq("ta_id", profile.id)
      .single();

    if (taLink) {
      const { data: linkedProject } = await adminClient
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      project = linkedProject;
    }
  }

  if (!project) notFound();

  const [tasksResult, documentsResult, teamResult] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", id)
      .eq("published", true)
      .order("created_at", { ascending: false }),
    adminClient
      .from("project_tas")
      .select("id, ta_id, role, profiles!project_tas_ta_id_fkey(first_name, last_name, preferred_name, photo_url, phone, phone_consent)")
      .eq("project_id", id),
  ]);

  // Transform team data to match expected interface
  const teamMembers = (teamResult.data || []).map((t) => ({
    id: t.id,
    ta_id: t.ta_id,
    role: t.role,
    profile: (t.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
      preferred_name: string | null;
      photo_url: string | null;
      phone: string | null;
      phone_consent: boolean;
    }) || {
      first_name: null,
      last_name: null,
      preferred_name: null,
      photo_url: null,
      phone: null,
      phone_consent: false,
    },
  }));

  return (
    <TAProjectView
      project={project}
      tasks={tasksResult.data || []}
      documents={documentsResult.data || []}
      teamMembers={teamMembers}
    />
  );
}
