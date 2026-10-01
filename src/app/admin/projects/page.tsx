import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AdminProjectFilters } from "@/components/admin/admin-project-filters";

export default async function AdminProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, program_type, school, location, start_date, end_date, days, status, created_at, ta_id, profiles!projects_ta_id_fkey(first_name, last_name, email), project_tasks(id, completed)")
    .order("created_at", { ascending: false });

  const projectsList = (projects || []).map((p) => {
    const ta = p.profiles as unknown as { first_name: string; last_name: string; email: string } | null;
    const tasks = (p.project_tasks as { id: string; completed: boolean }[]) || [];
    return {
      id: p.id,
      name: p.name,
      program_type: p.program_type,
      school: p.school,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      ta_name: ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—",
      total_tasks: tasks.length,
      completed_tasks: tasks.filter((t) => t.completed).length,
    };
  });

  return <AdminProjectFilters projects={projectsList} />;
}
