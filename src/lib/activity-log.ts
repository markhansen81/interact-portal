import { createAdminClient } from "@/lib/supabase/admin";

export async function logActivity({
  jobId,
  workOrderId,
  taId,
  action,
  details,
  performedBy,
}: {
  jobId?: string | null;
  workOrderId?: string | null;
  taId?: string | null;
  action: string;
  details?: string | null;
  performedBy?: string | null;
}) {
  const adminClient = createAdminClient();
  await adminClient.from("activity_log").insert({
    job_id: jobId || null,
    work_order_id: workOrderId || null,
    ta_id: taId || null,
    action,
    details: details || null,
    performed_by: performedBy || null,
  });
}
