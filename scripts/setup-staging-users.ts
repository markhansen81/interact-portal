/**
 * Create dedicated E2E test accounts in a Supabase project.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/setup-staging-users.ts
 *
 * This script:
 * 1. Creates auth users via Supabase Admin API
 * 2. The handle_new_user trigger auto-creates profile rows
 * 3. Outputs credentials for .env.test / GitHub secrets
 *
 * Safe to re-run: skips users that already exist.
 * Only run against STAGING — never production.
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Safety: refuse to run against known production project
const PRODUCTION_REFS = ["rzpncpxpixjnogjgtwcx"]; // Add your production project ref here
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (projectRef && PRODUCTION_REFS.includes(projectRef)) {
  console.error(`REFUSING to run against production project: ${projectRef}`);
  console.error("This script should only target staging.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function generatePassword(): string {
  return `E2e-${crypto.randomBytes(12).toString("base64url")}!`;
}

interface TestUser {
  email: string;
  role: "admin" | "ta";
  envPrefix: string;
}

const TEST_USERS: TestUser[] = [
  { email: "e2e-admin@interactenglish.de", role: "admin", envPrefix: "E2E_ADMIN" },
  { email: "e2e-ta-a@interactenglish.de", role: "ta", envPrefix: "E2E_TA_A" },
  { email: "e2e-ta-b@interactenglish.de", role: "ta", envPrefix: "E2E_TA_B" },
];

// Fixed UUIDs matching seed.sql
const USER_IDS: Record<string, string> = {
  "e2e-admin@interactenglish.de": "11111111-1111-1111-1111-111111111111",
  "e2e-ta-a@interactenglish.de": "22222222-2222-2222-2222-222222222222",
  "e2e-ta-b@interactenglish.de": "33333333-3333-3333-3333-333333333333",
};

async function main() {
  console.log(`\nTarget: ${SUPABASE_URL} (ref: ${projectRef})\n`);

  const credentials: string[] = [];

  for (const user of TEST_USERS) {
    const password = generatePassword();
    const id = USER_IDS[user.email];

    // Check if user already exists
    const { data: existing } = await admin.auth.admin.getUserById(id);
    if (existing?.user) {
      console.log(`  [skip] ${user.email} already exists (${id})`);
      // Update password so we have a known credential
      await admin.auth.admin.updateUserById(id, { password });
      console.log(`  [update] Password reset for ${user.email}`);
    } else {
      // Create new user with fixed UUID
      const { error } = await admin.auth.admin.createUser({
        id,
        email: user.email,
        password,
        email_confirm: true,
        user_metadata: { role: user.role },
      });

      if (error) {
        console.error(`  [error] ${user.email}: ${error.message}`);
        continue;
      }
      console.log(`  [created] ${user.email} (${id})`);
    }

    credentials.push(`${user.envPrefix}_EMAIL=${user.email}`);
    credentials.push(`${user.envPrefix}_PASS=${password}`);
  }

  console.log("\n─── Environment Variables (add to .env.test and GitHub secrets) ───\n");
  for (const line of credentials) {
    console.log(line);
  }

  console.log("\nE2E_SCHOOL_PROJECT_TOKEN=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  console.log("\n─── Next steps ───");
  console.log("1. Copy these values to .env.test (local) and GitHub Actions secrets");
  console.log("2. Run: psql $DATABASE_URL < supabase/seed.sql");
  console.log("3. Run E2E tests: npx playwright test\n");
}

main().catch(console.error);
