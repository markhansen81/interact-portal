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

  // Fetch team members with full profile data
  const { data: teamData } = await adminClient
    .from("project_tas")
    .select("id, ta_id, role, profiles!project_tas_ta_id_fkey(id, first_name, last_name, preferred_name, phone, phone_consent, photo_url, where_from, moved_to_germany, likes_germany, vacation_spot, great_at, not_great_at, art_type, superpower, famous_last_words, dietary_restrictions, dietary_options, hometown_city, hometown_country)")
    .eq("project_id", project.id);

  const teamMembers = (teamData || []).map((t) => {
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
    <SchoolProjectView
      project={project}
      groups={groups || []}
      documents={documents || []}
      token={token}
      teamMembers={teamMembers}
    />
  );
}
