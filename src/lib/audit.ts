import { createAdminClient } from "@/lib/supabase/admin";

type AuditAction =
  | "profile_viewed"
  | "profile_updated"
  | "sensitive_data_accessed"
  | "document_downloaded"
  | "invoice_approved"
  | "invoice_rejected"
  | "expense_approved"
  | "expense_rejected"
  | "data_exported"
  | "data_deleted"
  | "login"
  | "login_failed";

export async function logAudit(params: {
  userId: string;
  action: AuditAction;
  targetId?: string;
  targetType?: string;
  details?: string;
  ip?: string;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();
    await adminClient.from("audit_log").insert({
      user_id: params.userId,
      action: params.action,
      target_id: params.targetId || null,
      target_type: params.targetType || null,
      details: params.details || null,
      ip_address: params.ip || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log:", err);
  }
}
