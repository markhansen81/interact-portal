import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminProjectView } from "@/components/admin/admin-project-view";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, profiles!projects_ta_id_fkey(first_name, last_name, email)")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const [tasksResult, documentsResult, teamResult, groupsResult] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    adminClient
      .from("project_tas")
      .select("ta_id, role, profiles!project_tas_ta_id_fkey(first_name, last_name, email)")
      .eq("project_id", id),
    adminClient
      .from("project_groups")
      .select("id, name, project_students(id)")
      .eq("project_id", id),
  ]);

  const ta = project.profiles as { first_name: string; last_name: string; email: string } | null;
  const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "\u2014";

  const teamMembers = (teamResult.data || []).map((t) => {
    const p = t.profiles as unknown as { first_name: string | null; last_name: string | null; email: string | null } | null;
    return {
      ta_id: t.ta_id,
      role: t.role,
      first_name: p?.first_name || null,
      last_name: p?.last_name || null,
      email: p?.email || null,
    };
  });

  const groupSummaries = (groupsResult.data || []).map((g) => ({
    id: g.id,
    name: g.name,
    student_count: Array.isArray(g.project_students) ? g.project_students.length : 0,
  }));

  return (
    <AdminProjectView
      project={{ ...project, ta_name: taName }}
      tasks={tasksResult.data || []}
      documents={documentsResult.data || []}
      teamMembers={teamMembers}
      groupSummaries={groupSummaries}
    />
  );
}
