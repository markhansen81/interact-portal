-- ============================================================================
-- InterACT Portal — Staging Seed Data
-- ============================================================================
-- Synthetic test data for the staging environment. No production data.
-- Run AFTER auth users are created via the setup script (scripts/setup-staging-users.ts).
--
-- Test user IDs (must match auth.users created by setup script):
--   Admin:  11111111-1111-1111-1111-111111111111
--   TA A:   22222222-2222-2222-2222-222222222222
--   TA B:   33333333-3333-3333-3333-333333333333
--
-- School project token: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
-- ============================================================================

BEGIN;

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- These should already exist via handle_new_user trigger, but upsert to be safe.

INSERT INTO profiles (id, email, role, first_name, last_name, phone, is_active, onboarding_status, training_online, training_offline, bio, superpower, photo_url)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'e2e-admin@interactenglish.de', 'admin', 'Test', 'Admin', '+49 170 0000001', true, 'complete', false, false, NULL, NULL, NULL),
  ('22222222-2222-2222-2222-222222222222', 'e2e-ta-a@interactenglish.de', 'ta', 'Anna', 'Testovic', '+49 170 0000002', true, 'complete', true, true, 'Creative arts educator with 5 years experience.', 'Storytelling', NULL),
  ('33333333-3333-3333-3333-333333333333', 'e2e-ta-b@interactenglish.de', 'ta', 'Ben', 'Tester', '+49 170 0000003', true, 'in_progress', true, false, 'Music and theatre specialist.', 'Improvisation', NULL)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- ── Documents (compliance) ───────────────────────────────────────────────────

INSERT INTO documents (id, ta_id, type, status, expiry_date, file_url, uploaded_at) VALUES
  -- TA A: all docs approved (compliant)
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'right_to_work', 'approved', '2028-06-01', 'staging/docs/ta-a-rtw.pdf', now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'police_check', 'approved', '2028-06-01', 'staging/docs/ta-a-police.pdf', now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'measles', 'approved', NULL, 'staging/docs/ta-a-measles.pdf', now()),
  -- TA B: one doc pending, one expired
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'right_to_work', 'approved', '2028-06-01', 'staging/docs/ta-b-rtw.pdf', now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'police_check', 'uploaded', '2028-06-01', 'staging/docs/ta-b-police.pdf', now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'measles', 'approved', '2025-01-01', 'staging/docs/ta-b-measles-expired.pdf', now());

-- ── Projects ─────────────────────────────────────────────────────────────────

INSERT INTO projects (id, name, school, start_date, end_date, program_type, status, school_token, created_at) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Native Speaker Week — Goethe Schule', 'Goethe Schule Berlin', '2027-03-10', '2027-03-14', 'Native Speaker Week', 'active', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', now()),
  ('55555555-5555-5555-5555-555555555555', 'Theatre Week — Rosa Luxemburg', 'Rosa Luxemburg Schule', '2027-04-07', '2027-04-11', 'Theatre Week', 'planning', NULL, now());

-- ── Project TAs ──────────────────────────────────────────────────────────────

INSERT INTO project_tas (id, project_id, ta_id) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333');

-- ── Project Groups + Students ────────────────────────────────────────────────

INSERT INTO project_groups (id, project_id, name, grade) VALUES
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'Class 3a', '3'),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Class 3b', '3');

INSERT INTO project_students (id, group_id, first_name, last_name) VALUES
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'Max', 'Mustermann'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'Lisa', 'Schmidt'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'Tom', 'Mueller'),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 'Sophie', 'Weber'),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', 'Felix', 'Fischer');

-- ── Work Orders ──────────────────────────────────────────────────────────────

INSERT INTO work_orders (id, ta_id, project_id, project_name, school, program_type, start_date, end_date, status, created_at) VALUES
  -- TA A: one signed, one sent (unsigned)
  ('aaaaaaaa-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Native Speaker Week — Goethe Schule', 'Goethe Schule Berlin', 'Native Speaker Week', '2027-03-10', '2027-03-14', 'signed', now() - interval '14 days'),
  ('aaaaaaaa-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Theatre Week — Rosa Luxemburg', 'Rosa Luxemburg Schule', 'Theatre Week', '2027-04-07', '2027-04-11', 'sent', now() - interval '3 days'),
  -- TA B: one signed (for cross-account isolation tests)
  ('bbbbbbbb-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'Theatre Week — Rosa Luxemburg', 'Rosa Luxemburg Schule', 'Theatre Week', '2027-04-07', '2027-04-11', 'signed', now() - interval '7 days');

-- ── Invoices ─────────────────────────────────────────────────────────────────

INSERT INTO invoices (id, ta_id, work_order_id, status, total, created_at) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-1111-1111-1111-111111111111', 'submitted', 850.00, now() - interval '2 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-1111-1111-1111-111111111111', 'approved', 720.00, now() - interval '5 days');

-- ── Expense Claims ───────────────────────────────────────────────────────────

INSERT INTO expense_claims (id, ta_id, status, notes, created_at) VALUES
  ('cccccccc-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'submitted', 'Train tickets Berlin-Munich', now() - interval '1 day');

INSERT INTO expense_items (id, expense_claim_id, description, amount, category) VALUES
  (gen_random_uuid(), 'cccccccc-1111-1111-1111-111111111111', 'ICE Berlin-Munich return', 89.90, 'transport'),
  (gen_random_uuid(), 'cccccccc-1111-1111-1111-111111111111', 'Taxi to school', 24.50, 'transport');

-- ── Offers ───────────────────────────────────────────────────────────────────

INSERT INTO offers (id, offer_number, school_name, contact_name, contact_email, program_type, status, tariff, created_by, created_at) VALUES
  (gen_random_uuid(), 'ANG-2027-001', 'Goethe Schule Berlin', 'Frau Meyer', 'meyer@goethe-schule.de', 'Native Speaker Week', 'sent', 1, '11111111-1111-1111-1111-111111111111', now() - interval '10 days'),
  (gen_random_uuid(), 'ANG-2027-002', 'Einstein Gymnasium', 'Herr Schmidt', 'schmidt@einstein-gym.de', 'Theatre Week', 'draft', 1, '11111111-1111-1111-1111-111111111111', now() - interval '1 day');

-- ── Availability (TA A has some available dates) ─────────────────────────────

INSERT INTO availability (id, ta_id, date, status) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2027-03-10', 'available'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2027-03-11', 'available'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2027-03-12', 'available'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2027-03-13', 'available'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '2027-03-14', 'available'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '2027-04-07', 'available'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '2027-04-08', 'unavailable');

-- ── Notifications ────────────────────────────────────────────────────────────

INSERT INTO notifications (id, user_id, title, body, read, created_at) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'New Work Order', 'You have a new work order for Theatre Week — Rosa Luxemburg.', false, now() - interval '3 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Document Approved', 'Your police check has been approved.', true, now() - interval '10 days');

COMMIT;
