import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // First login — auto-create admin profile for @interactenglish.de
        const nameParts = (user.user_metadata?.full_name ?? user.email!.split("@")[0]).split(" ");
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          first_name: nameParts[0] ?? "",
          last_name: nameParts.slice(1).join(" ") ?? "",
          role: "admin",
        });
      } else if (profile.role !== "admin") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/admin?error=not_admin`);
      }
    }
  }

  const next = searchParams.get("next");
  return NextResponse.redirect(next ? `${origin}${next}` : origin);
}
