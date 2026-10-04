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
      .select("id, ta_id, role, profiles!project_tas_ta_id_fkey(id, first_name, last_name, preferred_name, phone, phone_consent, photo_url, where_from, moved_to_germany, likes_germany, vacation_spot, great_at, not_great_at, art_type, superpower, famous_last_words, dietary_restrictions, dietary_options, hometown_city, hometown_country)")
      .eq("project_id", id),
  ]);

  // Transform team data to match expected interface
  const teamMembers = (teamResult.data || []).map((t) => {
    const p = t.profiles as unknown as Record<string, unknown> | null;
    return {
      id: t.id,
      ta_id: t.ta_id,
      role: t.role,
      profile: {
        id: (p?.id as string) || t.ta_id,
        first_name: (p?.first_name as string | null) || null,
        last_name: (p?.last_name as string | null) || null,
        preferred_name: (p?.preferred_name as string | null) || null,
        photo_url: (p?.photo_url as string | null) || null,
        phone: (p?.phone as string | null) || null,
        phone_consent: (p?.phone_consent as boolean) || false,
        where_from: (p?.where_from as string | null) || null,
        moved_to_germany: (p?.moved_to_germany as string | null) || null,
        likes_germany: (p?.likes_germany as string | null) || null,
        vacation_spot: (p?.vacation_spot as string | null) || null,
        great_at: (p?.great_at as string | null) || null,
        not_great_at: (p?.not_great_at as string | null) || null,
        art_type: (p?.art_type as string | null) || null,
        superpower: (p?.superpower as string | null) || null,
        famous_last_words: (p?.famous_last_words as string | null) || null,
        dietary_restrictions: (p?.dietary_restrictions as string | null) || null,
        dietary_options: (p?.dietary_options as string[] | null) || null,
        hometown_city: (p?.hometown_city as string | null) || null,
        hometown_country: (p?.hometown_country as string | null) || null,
      },
    };
  });

  return (
    <TAProjectView
      project={project}
      tasks={tasksResult.data || []}
      documents={documentsResult.data || []}
      teamMembers={teamMembers}
    />
  );
}
