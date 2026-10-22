import { createClient } from "@/lib/supabase/server";
import { ContractTemplateEditor } from "@/components/admin/contract-template-editor";

export default async function ContractTemplatesPage() {
 const supabase = await createClient();

 const { data: templates } = await supabase
 .from("contract_templates")
 .select("*")
 .order("type")
 .order("version", { ascending: false });

 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-neutral-900">
 Contract Templates
 </h2>
 <p className="mt-1 text-sm text-neutral-500">
 Edit templates for framework contracts, declarations, and other signable documents.
 </p>
 </div>
 <ContractTemplateEditor templates={templates || []} />
 </div>
 );
}
