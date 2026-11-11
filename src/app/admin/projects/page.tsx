import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminProjectFilters } from "@/components/admin/admin-project-filters";

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [projectsResult, teamResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, program_type, school, location, start_date, end_date, days, status, created_at, ta_id, profiles!projects_ta_id_fkey(first_name, last_name, email), project_tasks(id, completed)")
      .order("created_at", { ascending: false }),
    adminClient
      .from("project_tas")
      .select("project_id, profiles!project_tas_ta_id_fkey(first_name, last_name, email)"),
  ]);

  // Build map: project_id -> team member names
  const teamByProject = new Map<string, string[]>();
  for (const t of teamResult.data || []) {
    const p = t.profiles as unknown as { first_name: string | null; last_name: string | null; email: string } | null;
    if (!p) continue;
    const name = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email;
    const existing = teamByProject.get(t.project_id) || [];
    existing.push(name);
    teamByProject.set(t.project_id, existing);
  }

  const projectsList = (projectsResult.data || []).map((p) => {
    const ta = p.profiles as unknown as { first_name: string; last_name: string; email: string } | null;
    const tasks = (p.project_tasks as { id: string; completed: boolean }[]) || [];
    const primaryName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—";
    // Merge primary TA with team members (deduplicate by name)
    const teamNames = teamByProject.get(p.id) || [];
    const allNames = Array.from(new Set([primaryName !== "—" ? primaryName : null, ...teamNames].filter(Boolean))) as string[];
    return {
      id: p.id,
      name: p.name,
      program_type: p.program_type,
      school: p.school,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      ta_name: primaryName,
      team_names: allNames,
      total_tasks: tasks.length,
      completed_tasks: tasks.filter((t) => t.completed).length,
    };
  });

  return <AdminProjectFilters projects={projectsList} />;
}
