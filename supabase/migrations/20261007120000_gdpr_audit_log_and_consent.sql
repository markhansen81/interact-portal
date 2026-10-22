-- Audit log table for GDPR compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_id text,
  target_type text,
  details text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for querying by user, action, and time
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- RLS: only service role can insert/read audit logs (no public policies)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- GDPR consent tracking columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_special_category_consent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gdpr_consent_version text;

-- Soft-delete timestamp for GDPR data anonymization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
