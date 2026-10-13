import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// DATEV OAuth2 + Accounting-Documents API client
// ---------------------------------------------------------------------------

// Sandbox
const DATEV_AUTH_URL_SANDBOX =
  "https://login.datev.de/openidsandbox/authorize";
const DATEV_TOKEN_URL_SANDBOX = "https://sandbox-api.datev.de/token";
const DATEV_API_BASE_SANDBOX =
  "https://accounting-documents.api.datev.de/platform-sandbox/v2";

// Production
const DATEV_AUTH_URL_PROD = "https://login.datev.de/openid/authorize";
const DATEV_TOKEN_URL_PROD = "https://login.datev.de/openid/token";
const DATEV_API_BASE_PROD =
  "https://accounting-documents.api.datev.de/platform/v2";

function isProd() {
  return process.env.DATEV_ENV === "production"; // App is sandbox until DATEV approves production upgrade
}

function authUrl() {
  return isProd() ? DATEV_AUTH_URL_PROD : DATEV_AUTH_URL_SANDBOX;
}

function tokenUrl() {
  return isProd() ? DATEV_TOKEN_URL_PROD : DATEV_TOKEN_URL_SANDBOX;
}

function apiBase() {
  return isProd() ? DATEV_API_BASE_PROD : DATEV_API_BASE_SANDBOX;
}

function clientId() {
  return process.env.DATEV_CLIENT_ID ?? "";
}

function clientSecret() {
  return process.env.DATEV_CLIENT_SECRET ?? "";
}

const SCOPES =
  "openid profile email accounting:documents";

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64url(hash);
}

// ---------------------------------------------------------------------------
// Basic-auth header for token requests
// ---------------------------------------------------------------------------

function basicAuth(): string {
  const encoded = Buffer.from(`${clientId()}:${clientSecret()}`).toString(
    "base64"
  );
  return `Basic ${encoded}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate the DATEV OAuth2 authorization URL with PKCE.
 */
export function getDatevAuthUrl(
  redirectUri: string,
  state: string
): { url: string; codeVerifier: string } {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return { url: `${authUrl()}?${params.toString()}`, codeVerifier };
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeDatevToken(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DATEV token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
export async function refreshDatevToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(tokenUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DATEV token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * List available DATEV clients for the authenticated user.
 */
export async function listDatevClients(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${apiBase()}/clients`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DATEV list clients failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Normalise — the API returns an array of client objects
  return (data as Array<Record<string, unknown>>).map((c) => ({
    id: String(c.id ?? c.client_id ?? ""),
    name: String(c.name ?? c.client_name ?? ""),
  }));
}

/**
 * Upload a PDF document to DATEV for a specific client.
 */
export async function uploadDatevDocument(
  accessToken: string,
  clientId: string,
  pdf: Buffer,
  filename: string,
  documentType: string
): Promise<{ id: string; status: string }> {
  const boundary = `----DatevUpload${crypto.randomBytes(8).toString("hex")}`;

  // Build multipart body manually
  const metadataJson = JSON.stringify({ document_type: documentType });

  const parts: Buffer[] = [];

  // Metadata part
  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="metadata"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        metadataJson +
        `\r\n`
    )
  );

  // File part
  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: application/pdf\r\n\r\n`
    )
  );
  parts.push(pdf);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const res = await fetch(
    `${apiBase()}/clients/${encodeURIComponent(clientId)}/documents`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DATEV document upload failed (${res.status}): ${text}`);
  }

  const result = await res.json();
  return {
    id: String(result.id ?? result.document_id ?? ""),
    status: String(result.status ?? "uploaded"),
  };
}

/**
 * High-level helper: fetch tokens, auto-refresh if expired, upload document.
 * Returns success/failure with optional document ID.
 */
export async function uploadDocumentToDATEV(
  pdf: Buffer,
  filename: string,
  notes: string
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const adminClient = createAdminClient();

  // Fetch the stored DATEV tokens
  const { data: tokenRow, error: fetchErr } = await adminClient
    .from("datev_tokens")
    .select("*")
    .limit(1)
    .single();

  if (fetchErr || !tokenRow) {
    return {
      success: false,
      error: `No DATEV tokens found: ${fetchErr?.message ?? "no row"}`,
    };
  }

  let accessToken: string = tokenRow.access_token;
  const selectedClientId: string | null = tokenRow.selected_client_id;

  if (!selectedClientId) {
    return { success: false, error: "No DATEV client selected (selected_client_id is null)" };
  }

  // Check if token is expired (with 60s buffer)
  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (Date.now() > expiresAt - 60_000) {
    try {
      const refreshed = await refreshDatevToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;

      // Persist refreshed tokens
      await adminClient
        .from("datev_tokens")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(
            Date.now() + refreshed.expires_in * 1000
          ).toISOString(),
        })
        .eq("id", tokenRow.id);
    } catch (refreshErr) {
      return {
        success: false,
        error: `Token refresh failed: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`,
      };
    }
  }

  // Upload the document
  try {
    const result = await uploadDatevDocument(
      accessToken,
      selectedClientId,
      pdf,
      filename,
      notes // passed as documentType / metadata note
    );

    return { success: true, documentId: result.id };
  } catch (uploadErr) {
    return {
      success: false,
      error: `Upload failed: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`,
    };
  }
}

/**
 * Check the processing status of an uploaded document.
 */
export async function getDatevDocumentStatus(
  accessToken: string,
  clientId: string,
  documentId: string
): Promise<{ status: string }> {
  const res = await fetch(
    `${apiBase()}/clients/${encodeURIComponent(clientId)}/documents/${encodeURIComponent(documentId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `DATEV document status check failed (${res.status}): ${text}`
    );
  }

  const data = await res.json();
  return { status: String(data.status ?? "unknown") };
}
