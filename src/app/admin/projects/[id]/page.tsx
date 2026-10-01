import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminProjectView } from "@/components/admin/admin-project-view";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, profiles!projects_ta_id_fkey(first_name, last_name, email)")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  const { data: documents } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const ta = project.profiles as { first_name: string; last_name: string; email: string } | null;
  const taName = ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "—";

  return (
    <AdminProjectView
      project={{ ...project, ta_name: taName }}
      tasks={tasks || []}
      documents={documents || []}
    />
  );
}
