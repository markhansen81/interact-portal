# RLS (Row Level Security) Audit

**Date:** 2026-10-07
**Auditor:** Automated security review

## Summary

- **Total tables:** 51
- **RLS enabled:** 44
- **RLS disabled:** 7 (see Critical section below)

---

## CRITICAL: Tables WITHOUT RLS

These tables are fully exposed to anyone with the anon key. Any unauthenticated or authenticated user can read/modify every row.

| Table | Rows | Risk | Recommended Action |
|-------|------|------|-------------------|
| `market_snapshots` | 1 | Low (non-sensitive market data) | Enable RLS, add admin-only policy |
| `teacher_task_templates` | 6 | Low (template definitions) | Enable RLS, add read-all + admin-write policy |
| `scraped_properties` | 5 | Low (public property data) | Enable RLS, add admin-only policy |
| `suburbs` | 0 | Low (cached geo data) | Enable RLS, add admin-only policy |
| `external_listings` | 15 | Low (public listing data) | Enable RLS, add admin-only policy |
| `test_ping` | 1 | None (test table) | Enable RLS or drop table |
| `_pgrst_reload_log` | 1 | None (PostgREST internal) | Enable RLS, deny all via client |

### Remediation SQL (DO NOT auto-apply -- enabling RLS without policies blocks all access)

```sql
-- Step 1: Enable RLS
ALTER TABLE "public"."market_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teacher_task_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scraped_properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."suburbs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."external_listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."test_ping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_pgrst_reload_log" ENABLE ROW LEVEL SECURITY;

-- Step 2: Add policies (adjust per table needs)

-- market_snapshots: admin read/write, service_role all
CREATE POLICY "admin_all_market_snapshots" ON market_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "service_market_snapshots" ON market_snapshots FOR ALL
  USING (auth.role() = 'service_role');

-- teacher_task_templates: everyone reads, admin writes
CREATE POLICY "anyone_read_teacher_task_templates" ON teacher_task_templates FOR SELECT
  USING (true);
CREATE POLICY "admin_write_teacher_task_templates" ON teacher_task_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- scraped_properties: admin only
CREATE POLICY "admin_all_scraped_properties" ON scraped_properties FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "service_scraped_properties" ON scraped_properties FOR ALL
  USING (auth.role() = 'service_role');

-- suburbs: admin + service_role
CREATE POLICY "admin_all_suburbs" ON suburbs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "service_suburbs" ON suburbs FOR ALL
  USING (auth.role() = 'service_role');

-- external_listings: admin + service_role
CREATE POLICY "admin_all_external_listings" ON external_listings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "service_external_listings" ON external_listings FOR ALL
  USING (auth.role() = 'service_role');

-- test_ping: consider dropping, or admin only
CREATE POLICY "admin_all_test_ping" ON test_ping FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- _pgrst_reload_log: deny all client access
CREATE POLICY "deny_all_pgrst" ON _pgrst_reload_log FOR ALL
  USING (false);
```

---

## Tables WITH RLS -- Policy Review

### Sensitive Data Tables

| Table | RLS | Policies | Assessment |
|-------|-----|----------|------------|
| `profiles` | YES | Admin SELECT/UPDATE/INSERT, user own SELECT/UPDATE/INSERT | OK -- IBAN, tax_number protected by own-row policy |
| `invoices` | YES | Admin ALL, TA own ALL + SELECT | OK -- TA can only see own invoices |
| `expense_claims` | YES | Admin ALL, TA own ALL + SELECT | OK |
| `expense_items` | YES | Admin ALL, TA own (via claim join) ALL + SELECT | OK |
| `work_orders` | YES | Admin ALL, TA own SELECT + UPDATE | OK |
| `documents` | YES | Admin ALL, TA own ALL + SELECT | OK |
| `admin_uploads` | YES | Admin ALL only | OK |
| `datev_tokens` | YES | Policies not visible (likely admin/service only) | Review manually |
| `insurance_orders` | YES | Admin SELECT + ALL, service_role ALL | OK |
| `contracts` | YES | Admin ALL, TA own SELECT | OK |
| `school_invoices` | YES | Admin ALL, service ALL (overly permissive -- see note) | REVIEW |

### Policy Concerns

1. **`school_invoices`** -- `service_all_school_invoices` policy uses `USING (true)` which allows ANY authenticated user full access, not just service_role. This should be restricted:
   ```sql
   -- Fix: replace the overly permissive policy
   DROP POLICY "service_all_school_invoices" ON school_invoices;
   CREATE POLICY "service_all_school_invoices" ON school_invoices FOR ALL
     USING (auth.role() = 'service_role');
   ```

2. **`teacher_tasks`** -- `service_all_teacher_tasks` policy uses `USING (true)` which allows ANY user full access. Should be restricted to service_role + admin + assigned TA:
   ```sql
   DROP POLICY "service_all_teacher_tasks" ON teacher_tasks;
   CREATE POLICY "admin_all_teacher_tasks" ON teacher_tasks FOR ALL
     USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
   CREATE POLICY "service_teacher_tasks" ON teacher_tasks FOR ALL
     USING (auth.role() = 'service_role');
   CREATE POLICY "ta_own_teacher_tasks" ON teacher_tasks FOR SELECT
     USING (ta_id = auth.uid());
   CREATE POLICY "ta_update_teacher_tasks" ON teacher_tasks FOR UPDATE
     USING (ta_id = auth.uid());
   ```

3. **`handbook_interviews`** -- Full access for ALL authenticated users (`USING (true)`). Should be restricted to admin + the interviewer/interviewee.

4. **`admin_project_tasks`** -- Has `service_insert_admin_tasks` with `WITH CHECK (true)`, allowing any user to insert. Should be restricted to service_role.

5. **`activity_log`** -- Insert policy uses `WITH CHECK (true)`, allowing any user to insert log entries. Consider restricting.

### Non-Sensitive Tables (OK as-is)

| Table | RLS | Notes |
|-------|-----|-------|
| `services` | YES | Auth read, admin write |
| `contract_templates` | YES | Auth read, admin write |
| `pay_scales` | YES | Auth read, admin write |
| `travel_stipends` | YES | Auth read, admin write |
| `work_order_templates` | YES | Auth read, admin write |
| `jobs` | YES | Admin only |
| `availability` | YES | Admin read, TA own |
| `notifications` | YES | User own, admin all |
| `messages` | YES | User own send/receive, admin all |
| `ta_program_preferences` | YES | Admin read, TA own |
| `form_content` | YES | Public read, admin write |
| `admin_review_tasks` | YES | Admin all, TA own read |
| `leads` | YES | Admin + service_role |
| `church_items` | YES | Admin + service_role |
| `church_ta_slots` | YES | Admin + service_role + TA own read |
| `crm_automation_log` | YES | Admin read + service_role |
| `projects` | YES | Admin all, TA own read, service insert |
| `project_tasks` | YES | Admin all, TA read/update own, service insert |
| `project_documents` | YES | Admin all, TA read published |
| `project_task_templates` | YES | Admin read |
| `document_templates` | YES | Admin all, service read |
| `project_tas` | YES | Admin all, TA own read, service insert |
| `project_groups` | YES | Admin all, TA read, service insert |
| `project_students` | YES | Admin all, TA read, service insert |
| `attendance_records` | YES | Admin all, TA own (via project join) |
| `admin_task_templates` | YES | Public read (templates are non-sensitive) |
| `health_checks` | YES | Policies not listed (likely admin/service) |
| `invoice_addons` | YES | Admin all, TA own (via invoice join) |

---

## Priority Actions

1. **HIGH:** Fix `school_invoices` and `teacher_tasks` overly permissive policies (USING true)
2. **MEDIUM:** Enable RLS on 7 unprotected tables
3. **LOW:** Restrict `handbook_interviews` to appropriate roles
4. **LOW:** Tighten service_insert policies that use `WITH CHECK (true)`
