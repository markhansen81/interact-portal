# Staging Environment Setup

## Overview

InterACT Portal uses three environments:

| Environment | Purpose | Supabase | URL |
|---|---|---|---|
| Production | Real staff and data | `rzpncpxpixjnogjgtwcx` | interact-portal.vercel.app |
| Staging | Employee testing, E2E tests | Separate project | stg branch preview |
| PR Preview | Automated testing per PR | Staging Supabase | Vercel preview URLs |

Staging has its own Supabase project with synthetic test data. No production data.

## Step 1: Create Staging Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project: `interact-portal-staging`
3. Note the project URL and keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Apply Migrations

Link the Supabase CLI to the staging project and apply all migrations:

```bash
supabase link --project-ref <STAGING_PROJECT_REF>
supabase db push
```

## Step 3: Create Test Users

```bash
SUPABASE_URL=https://<STAGING_REF>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<STAGING_SERVICE_KEY> \
npx tsx scripts/setup-staging-users.ts
```

This creates three test accounts and outputs credentials. Save them.

## Step 4: Seed Test Data

```bash
psql <STAGING_DATABASE_URL> < supabase/seed.sql
```

Or via Supabase dashboard: SQL Editor → paste contents of `supabase/seed.sql`.

## Step 5: Configure Vercel

In Vercel project settings, add environment variables scoped to the **Preview** environment (or specifically the `stg` branch):

| Variable | Value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service key | Preview |
| `RESEND_API_KEY` | Test mode key or empty | Preview |
| `NEXT_PUBLIC_APP_URL` | Preview URL (dynamic) | Preview |

**Important:** Disable or mock external integrations in staging:
- Resend: use test mode (emails logged, not sent)
- Monday.com: do not connect staging to production board
- Lanes & Planes: do not connect

## Step 6: Configure GitHub Actions Secrets

Add these secrets in GitHub repo settings → Secrets and variables → Actions:

```
# Supabase (staging project)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# E2E test accounts (from setup-staging-users.ts output)
E2E_ADMIN_EMAIL
E2E_ADMIN_PASS
E2E_TA_A_EMAIL
E2E_TA_A_PASS
E2E_TA_B_EMAIL
E2E_TA_B_PASS
E2E_SCHOOL_PROJECT_TOKEN

# Browserless
BROWSERLESS_API_KEY
```

## Step 7: Verify

Run E2E tests locally against staging:

```bash
# Load staging credentials
source .env.test

# Run against staging
TEST_BASE_URL=https://interact-portal-stg.vercel.app npx playwright test
```

## Test Accounts

| Role | Email | UUID |
|---|---|---|
| Admin | e2e-admin@interactenglish.de | 11111111-1111-1111-1111-111111111111 |
| TA A | e2e-ta-a@interactenglish.de | 22222222-2222-2222-2222-222222222222 |
| TA B | e2e-ta-b@interactenglish.de | 33333333-3333-3333-3333-333333333333 |

School project token: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` (project: Goethe Schule Berlin)

## Test Data

The seed script creates:
- 2 projects (1 active, 1 planning)
- 3 work orders (2 for TA A, 1 for TA B — various statuses)
- Compliance documents (TA A compliant, TA B has gaps)
- 2 invoices, 1 expense claim
- 2 offers (1 sent, 1 draft)
- Availability records
- Student groups and students
- Notifications

## Credential Rotation

After initial setup, rotate credentials periodically:

```bash
# Re-run setup script — it resets passwords for existing users
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/setup-staging-users.ts
```

Update `.env.test` and GitHub secrets with new passwords.
