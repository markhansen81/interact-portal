-- Track per-order repair email delivery state to prevent duplicate correction emails on retry
ALTER TABLE insurance_orders ADD COLUMN IF NOT EXISTS repair_email_sent_at timestamptz;
