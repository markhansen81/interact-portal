import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { JobDetail } from "@/components/admin/job-detail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  // Get existing work orders for this job
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("*, profiles!work_orders_ta_id_fkey(first_name, last_name, email, pay_level)")
    .eq("job_id", id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/jobs"
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          &larr; Back
        </Link>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {job.title}
        </h2>
      </div>
      <JobDetail job={job} workOrders={workOrders || []} />
    </div>
  );
}
