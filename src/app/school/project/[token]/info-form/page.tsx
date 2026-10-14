import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { InfoPackForm } from "@/components/school/info-pack-form";

export default async function InfoFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const adminClient = createAdminClient();

  const { data: project } = await adminClient
    .from("projects")
    .select(
      "id, name, school, program_type, start_date, end_date, days, teacher_name, teacher_email, info_pack_submitted_at"
    )
    .eq("teacher_token", token)
    .single();

  if (!project) notFound();

  return <InfoPackForm project={project} token={token} />;
}
