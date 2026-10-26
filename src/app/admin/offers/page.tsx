import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { OffersTable } from "@/components/admin/offers-table";
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
          <Link
            href="/admin/offers/new"
            className="inline-flex items-center justify-center font-medium transition-colors bg-neutral-900 text-white hover:bg-neutral-800 active:bg-black text-sm px-4 py-2"
          >
            New Offer
          </Link>
        }
      />
      <OffersTable offers={offers || []} />
    </div>
  );
}
