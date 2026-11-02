import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const source = searchParams.get("source");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // For admin SSO: enforce @interactenglish.de domain and admin role
    if (source === "admin") {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email?.endsWith("@interactenglish.de")) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/admin?error=domain`);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/admin?error=not_admin`);
      }
    }
  }

  const next = searchParams.get("next");
  return NextResponse.redirect(next ? `${origin}${next}` : origin);
}
