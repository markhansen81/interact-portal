import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, firstName, lastName } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!email.endsWith("@interactenglish.de")) {
    return NextResponse.json({ error: "Only @interactenglish.de emails can be admin users" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const tempPassword =
    Math.random().toString(36).slice(-8) +
    Math.random().toString(36).slice(-8).toUpperCase() +
    "!1";

  const { data: newUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (newUser.user) {
    await adminClient
      .from("profiles")
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        role: "admin",
      })
      .eq("id", newUser.user.id);
  }

  return NextResponse.json({
    success: true,
    userId: newUser.user?.id,
    tempPassword,
  });
}
