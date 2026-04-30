import { createClient } from "@/lib/supabase/server";
import { WorkOrderTemplateEditor } from "@/components/admin/work-order-template-editor";

export default async function WorkOrderTemplatePage() {
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("work_order_templates")
    .select("*")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Work Order Template Editor
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Design your work order template. Use variable tags to insert dynamic data from jobs.
        </p>
      </div>
      <WorkOrderTemplateEditor template={template} />
    </div>
  );
}
