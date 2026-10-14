# Supabase Storage Security Audit

**Date:** 2026-10-07
**Auditor:** Automated security review

## Current State

### Buckets

| Bucket | Public | Contents | Sensitive Data |
|--------|--------|----------|---------------|
| `documents` | **YES** | Invoices, expenses, receipts, onboarding docs, work order PDFs, insurance invoices, school invoices, project documents, profile photos | **YES** -- IBANs, tax numbers, personal addresses |

### Problem

The single `documents` bucket is **public**. Any file uploaded to it gets a permanent, guessable public URL:
```
https://<project>.supabase.co/storage/v1/object/public/documents/invoices/<uuid>.pdf
https://<project>.supabase.co/storage/v1/object/public/documents/expenses/<uuid>.pdf
```

These PDFs contain:
- **IBAN** and **BIC** (bank account numbers)
- **Tax numbers** (Steuernummer)
- **Full names and addresses**
- **Invoice amounts and payment details**

Anyone who guesses or enumerates UUIDs can access these documents without authentication.

### Storage RLS Policies (on storage.objects)

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Admins can read all files | SELECT | Admin role check |
| Authenticated users can read own files | SELECT | Any authenticated user |
| Authenticated users can upload | INSERT | Any authenticated user |

Note: These storage policies only apply when accessing via the Supabase client SDK with auth. **They do NOT protect public URLs** -- the `public` bucket flag bypasses RLS for direct URL access.

---

## Files Using `getPublicUrl()` (Exposure Points)

### API Routes (server-side -- CRITICAL)
1. `src/app/api/portal/expenses/route.ts` -- Expense PDFs with IBAN/tax number
2. `src/app/api/portal/invoices/route.ts` -- TA invoice PDFs with IBAN/tax number
3. `src/app/api/webhooks/squarespace/route.ts` -- Insurance invoice PDFs
4. `src/app/api/admin/projects/[id]/school-invoice/route.ts` -- School invoice PDFs
5. `src/app/api/admin/upload-invoices/route.ts` -- Admin-uploaded invoice PDFs
6. `src/app/api/admin/projects/[id]/documents/route.ts` -- Project documents

### Client Components (browser-side)
7. `src/components/portal/onboarding-wizard.tsx` -- Onboarding document uploads
8. `src/components/portal/profile-editor.tsx` -- Profile photo uploads
9. `src/components/portal/document-manager.tsx` -- Document uploads
10. `src/components/portal/invoice-uploader.tsx` -- TA-uploaded invoice PDFs
11. `src/components/portal/expense-claim-form.tsx` -- Receipt uploads
12. `src/components/portal/ta-work-order-view.tsx` -- Signed work order PDFs
13. `src/components/admin/program-form-editor.tsx` -- Program form images

---

## Recommended Changes

### Phase 1: Immediate (implemented in this PR)
- [x] Create `src/lib/storage.ts` helper that generates signed URLs (1-hour expiry)
- [x] Update `expenses/route.ts` to use signed URL instead of public URL
- [x] Update `invoices/route.ts` to use signed URL instead of public URL

**Note:** The `pdf_url` column now stores a signed URL (expires in 1 hour). The storage
path is deterministic (`invoices/<invoice_id>.pdf`, `expenses/<claim_id>.pdf`) so a fresh
signed URL can always be regenerated. When the bucket is made private (Phase 2), any code
that reads `pdf_url` to serve/fetch the PDF should regenerate a signed URL from the path
rather than using the stored value, since it may have expired.

### Phase 2: Short-term
- [ ] Make the `documents` bucket **private** in Supabase dashboard
- [ ] Update all remaining API routes to use `getSecureUrl()` instead of `getPublicUrl()`
- [ ] Update client components to request signed URLs from API endpoints instead of using `getPublicUrl()` directly
- [ ] Create a dedicated API endpoint: `GET /api/storage/signed-url?path=...` for client-side use

### Phase 3: Medium-term
- [ ] Split into separate buckets by sensitivity:
  - `public-assets` (public) -- profile photos, program images
  - `documents` (private) -- invoices, expenses, contracts, onboarding docs
- [ ] Add storage RLS policies that restrict file access by path prefix and user role
- [ ] Migrate existing public URLs stored in database columns to path-only references

### Migration Notes

When making the bucket private:
1. All existing `pdf_url` / `file_url` columns that store full public URLs will break
2. Need a migration to strip the base URL prefix and store only the storage path
3. All reads must go through `createSignedUrl()` or the new helper
4. The Squarespace webhook stores `invoice_pdf_url` as a full public URL -- this will need updating
5. Monday.com integrations that receive PDF URLs will get time-limited signed URLs (acceptable)
