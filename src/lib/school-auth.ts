import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Call at the top of each school project server page.
 * Reads the school_session cookie and validates it against the DB.
 * Redirects to the verify page if no valid session exists.
 * Pass nextPath to redirect back after verification (e.g. info-form).
 */
export async function requireSchoolSession(token: string, nextPath?: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionKey = cookieStore.get("school_session")?.value;

  const verifyUrl = `/school/project/${token}/verify${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  if (!sessionKey) {
    redirect(verifyUrl);
  }

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("school_otp_sessions")
    .select("id, project_token, expires_at, verified_at")
    .eq("session_key", sessionKey)
    .not("verified_at", "is", null)
    .single();

  if (
    !session ||
    session.project_token !== token ||
    new Date(session.expires_at) < new Date()
  ) {
    redirect(verifyUrl);
  }
}
