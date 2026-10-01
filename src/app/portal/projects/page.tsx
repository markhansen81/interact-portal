import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProjectTable } from "@/components/portal/project-table";

export default async function TAProjectsPage() {
  const profile = await requireAuth(["ta"]);
  if (!profile) redirect("/auth/login");

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, program_type, school, location, start_date, end_date, days, status, created_at, project_tasks(id, completed)")
    .eq("ta_id", profile.id)
    .order("start_date", { ascending: false });

  const projectsWithCounts = (projects || []).map((p) => {
    const tasks = (p.project_tasks as { id: string; completed: boolean }[]) || [];
    return {
      id: p.id,
      name: p.name,
      program_type: p.program_type,
      school: p.school,
      location: p.location,
      start_date: p.start_date,
      end_date: p.end_date,
      days: p.days,
      status: p.status,
      created_at: p.created_at,
      total_tasks: tasks.length,
      completed_tasks: tasks.filter((t) => t.completed).length,
    };
  });

  return <ProjectTable projects={projectsWithCounts} />;
}
