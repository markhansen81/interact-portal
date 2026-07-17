import { LeadForm } from "@/components/lead-form/lead-form";

export default async function LeadFormPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const locale = lang === "en" ? "en" : "de";

  return <LeadForm locale={locale} />;
}
