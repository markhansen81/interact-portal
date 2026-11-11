-- Fix dangerously permissive RLS policies
-- All tables affected are only written via adminClient (service key) which bypasses RLS,
-- making these policies unnecessary security holes.

-- school_invoices: drop policy granting ALL access to everyone
DROP POLICY IF EXISTS "service_all_school_invoices" ON school_invoices;

-- teacher_tasks: drop policy granting ALL access to everyone; add admin-only policy
DROP POLICY IF EXISTS "service_all_teacher_tasks" ON teacher_tasks;
CREATE POLICY "admin_all_teacher_tasks" ON teacher_tasks
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- projects: drop policy allowing anyone to INSERT projects
DROP POLICY IF EXISTS "service_insert_projects" ON projects;

-- Drop redundant service_insert_* policies (all writes use adminClient):
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "service_insert_admin_tasks" ON admin_project_tasks;
DROP POLICY IF EXISTS "service_insert_groups" ON project_groups;
DROP POLICY IF EXISTS "service_insert_students" ON project_students;
DROP POLICY IF EXISTS "service_insert_project_tas" ON project_tas;
DROP POLICY IF EXISTS "service_insert_tasks" ON project_tasks;

-- Drop dangerously permissive ALL-access policies on legacy/unused tables
DROP POLICY IF EXISTS "Service role full access on cashback_referrals" ON cashback_referrals;
DROP POLICY IF EXISTS "Authenticated users full access to handbook_interviews" ON handbook_interviews;
