import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Button } from "@/components/ui";
import { OffersTable } from "@/components/admin/offers-table";
import { BrochureUpload } from "@/components/admin/brochure-upload";
import Link from "next/link";

export default async function OffersPage() {
  const profile = await requireAuth(["admin"]);
  if (!profile) redirect("/auth/admin");

  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Offers"
        action={
          <div className="flex items-center gap-3">
            <BrochureUpload />
            <Link href="/admin/offers/new">
              <Button>New Offer</Button>
            </Link>
          </div>
        }
      />
      <OffersTable offers={offers || []} />
    </div>
  );
}
