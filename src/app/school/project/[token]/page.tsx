import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SchoolProjectView } from "@/components/school/school-project-view";

export default async function SchoolProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const adminClient = createAdminClient();

  // Look up project by teacher_token
  const { data: project } = await adminClient
    .from("projects")
    .select("*")
    .eq("teacher_token", token)
    .single();

  if (!project) notFound();

  // Fetch groups with students
  const { data: groups } = await adminClient
    .from("project_groups")
    .select("*, project_students(*)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  // Fetch published documents visible to teachers
  const { data: documents } = await adminClient
    .from("project_documents")
    .select("*")
    .eq("project_id", project.id)
    .in("visibility", ["teacher", "both"])
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <SchoolProjectView
      project={project}
      groups={groups || []}
      documents={documents || []}
      token={token}
    />
  );
}
