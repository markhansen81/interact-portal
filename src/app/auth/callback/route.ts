import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const source = searchParams.get("source");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // For admin SSO: enforce @interactenglish.de domain, auto-provision admin profile
    if (source === "admin") {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email?.endsWith("@interactenglish.de")) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/admin?error=domain`);
      }

      // Use admin client to bypass RLS for profile check/upsert
      const adminClient = createAdminClient();
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // Trigger didn't fire — create admin profile manually
        const nameParts = (user.user_metadata?.full_name ?? user.email!.split("@")[0]).split(" ");
        await adminClient.from("profiles").insert({
          id: user.id,
          email: user.email,
          first_name: nameParts[0] ?? "",
          last_name: nameParts.slice(1).join(" ") ?? "",
          role: "admin",
        });
      } else if (profile.role !== "admin") {
        // Upgrade @interactenglish.de users to admin automatically
        await adminClient.from("profiles").update({ role: "admin" }).eq("id", user.id);
      }

      return NextResponse.redirect(`${origin}/admin`);
    }
  }

  const next = searchParams.get("next");
  return NextResponse.redirect(next ? `${origin}${next}` : origin);
}
