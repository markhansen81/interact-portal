import { redirect, notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("ta_id", profile.id)
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
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <TAProjectView
      project={project}
      tasks={tasks || []}
      documents={documents || []}
    />
  );
}
