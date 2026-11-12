-- Enable RLS on school_otp_sessions (missed in original migration).
-- This table stores OTP codes and session keys for school portal access;
-- it must be inaccessible to anon/authenticated roles — service role only.
ALTER TABLE school_otp_sessions ENABLE ROW LEVEL SECURITY;

-- No public policies: all access goes through the service role (admin client).
-- Anon and authenticated users cannot read, insert, update, or delete rows.
