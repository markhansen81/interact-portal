import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Button } from "@/components/ui";
import { OffersTable } from "@/components/admin/offers-table";
import { NewOfferButton } from "@/components/admin/new-offer-button";
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
            <Link href="/admin/offers/content">
              <Button variant="ghost" size="sm">Edit Content</Button>
            </Link>
            <NewOfferButton />
          </div>
        }
      />
      <OffersTable offers={offers || []} />
    </div>
  );
}
