import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generate a time-limited signed URL for a file in Supabase storage.
 * Falls back to public URL if signed URL generation fails.
 *
 * @param bucket - Storage bucket name (e.g. "documents")
 * @param path - File path within the bucket (e.g. "invoices/abc-123.pdf")
 * @param expiresIn - URL validity in seconds (default: 3600 = 1 hour)
 * @returns Signed URL string
 */
export async function getSecureUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error(
      `[STORAGE] Failed to create signed URL for ${bucket}/${path}:`,
      error?.message || "No signed URL returned"
    );
    return "";
  }

  return data.signedUrl;
}

/**
 * Extract the storage path from a full Supabase public URL.
 * Useful for migrating existing public URLs to signed URLs.
 *
 * @param publicUrl - Full public URL like https://xxx.supabase.co/storage/v1/object/public/documents/invoices/abc.pdf
 * @param bucket - Bucket name to strip (default: "documents")
 * @returns Storage path like "invoices/abc.pdf", or null if URL doesn't match
 */
export function extractStoragePath(
  publicUrl: string,
  bucket = "documents"
): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}
