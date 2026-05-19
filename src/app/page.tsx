import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  // TAs who haven't started onboarding go straight there
  if (profile.onboarding_status === "pending" || !profile.onboarding_status) {
    redirect("/onboarding");
  }

  redirect("/portal");
}
