// Auto-generated types will go here via `supabase gen types`
// For now, define the core types manually

export type UserRole = "admin" | "ta" | "teacher";

export type DocumentStatus =
  | "not_uploaded"
  | "uploaded"
  | "verified"
  | "expiring"
  | "expired";

export type ContractStatus = "draft" | "sent" | "signed" | "declined";

export type WorkOrderStatus = "draft" | "sent" | "signed" | "declined";

export type InvoiceStatus = "submitted" | "approved" | "paid" | "rejected";

export type OnboardingStatus =
  | "pending"
  | "in_progress"
  | "awaiting_documents"
  | "ready";

export type TrainingType = "online_onboarding" | "offline_foundation";
