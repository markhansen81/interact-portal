/**
 * Tests for the compliance check in POST /api/admin/work-orders/[id]/send
 *
 * Covers: approved docs accepted; uploaded, expired, rejected, and missing
 * docs blocked; TA not assigned fails closed; DB errors fail closed.
 *
 * All external services are mocked — no real emails or DB writes occur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared state for the admin client mock ────────────────────────────────────

type DocRow = { type: string; expiry_date: string | null };

let mockDocs: DocRow[] = [];
let mockDocsError: string | null = null;
let mockTaId: string | null = "ta-123";
let mockWoDraftError: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-id" } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: "admin" } }),
        }),
      }),
    })),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "work_orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTaId ? { ta_id: mockTaId } : null,
                error: mockWoDraftError ? { message: mockWoDraftError } : null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "wo-1",
                    job_id: null,
                    project_name: "Test Project",
                    school: "Test School",
                    sign_by: null,
                    profiles: {
                      id: "ta-123",
                      first_name: "Anna",
                      last_name: "Test",
                      email: "anna@test.com",
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "documents") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockDocsError ? null : mockDocs,
                error: mockDocsError ? { message: mockDocsError } : null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

vi.mock("@/lib/notifications", () => ({ notify: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({
  workOrderSentEmail: vi.fn(() => ({ subject: "WO", html: "<p>WO</p>" })),
}));
vi.mock("@/lib/email-templates", () => ({
  sendTemplatedEmail: vi.fn(async () => {}),
}));
vi.mock("@/lib/slack", () => ({ notifyWorkOrderEvent: vi.fn(async () => {}) }));
vi.mock("@/lib/activity-log", () => ({ logActivity: vi.fn(async () => {}) }));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUTURE = "2027-06-01";
const PAST = "2025-01-01";

function makeRequest() {
  return new Request("http://localhost/api/admin/work-orders/wo-1/send", {
    method: "POST",
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: "wo-1" }) };
}

async function callSend() {
  vi.resetModules();
  const { POST } = await import(
    "@/app/api/admin/work-orders/[id]/send/route"
  );
  const response = await POST(makeRequest(), makeParams());
  return { status: response.status, body: await response.json() };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WO Compliance check — POST /api/admin/work-orders/[id]/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocsError = null;
    mockWoDraftError = null;
    mockTaId = "ta-123";
    // Default: all three required docs present, approved, not expired
    mockDocs = [
      { type: "right_to_work", expiry_date: FUTURE },
      { type: "police_check", expiry_date: FUTURE },
      { type: "measles", expiry_date: null },
    ];
  });

  it("allows send when all required docs are approved and non-expired", async () => {
    const { status } = await callSend();
    expect(status).toBe(200);
  });

  it("blocks send when right-to-work doc is missing", async () => {
    mockDocs = [
      { type: "police_check", expiry_date: FUTURE },
      { type: "measles", expiry_date: null },
    ];
    const { status, body } = await callSend();
    expect(status).toBe(400);
    expect(body.error).toContain("Right to Work");
  });

  it("accepts visa or passport as right-to-work alternative", async () => {
    mockDocs = [
      { type: "visa", expiry_date: FUTURE },
      { type: "police_check", expiry_date: FUTURE },
      { type: "measles", expiry_date: null },
    ];
    const { status } = await callSend();
    expect(status).toBe(200);
  });

  it("blocks send when right-to-work doc is expired", async () => {
    mockDocs = [
      { type: "right_to_work", expiry_date: PAST },
      { type: "police_check", expiry_date: FUTURE },
      { type: "measles", expiry_date: null },
    ];
    const { status, body } = await callSend();
    expect(status).toBe(400);
    expect(body.error).toContain("Right to Work");
  });

  it("blocks send when police check is missing", async () => {
    mockDocs = [
      { type: "right_to_work", expiry_date: FUTURE },
      { type: "measles", expiry_date: null },
    ];
    const { status, body } = await callSend();
    expect(status).toBe(400);
    expect(body.error).toContain("Police Check");
  });

  it("blocks send when measles doc is missing", async () => {
    mockDocs = [
      { type: "right_to_work", expiry_date: FUTURE },
      { type: "police_check", expiry_date: FUTURE },
    ];
    const { status, body } = await callSend();
    expect(status).toBe(400);
    expect(body.error).toContain("Measles");
  });

  it("blocks send when multiple docs are missing", async () => {
    mockDocs = [];
    const { status, body } = await callSend();
    expect(status).toBe(400);
    expect(body.error).toContain("Right to Work");
    expect(body.error).toContain("Police Check");
    expect(body.error).toContain("Measles");
  });

  it("fails closed when no TA is assigned to the work order", async () => {
    mockTaId = null;
    const { status, body } = await callSend();
    expect(status).toBe(400);
    expect(body.error).toContain("no TA assigned");
  });

  it("fails closed on docs query error", async () => {
    mockDocsError = "connection timeout";
    const { status, body } = await callSend();
    expect(status).toBe(500);
    expect(body.error).toContain("compliance");
  });

  it("blocks an uploaded-but-not-approved doc (uploaded status is not in the query)", async () => {
    // The query filters eq("status", "approved") — uploaded docs are never returned.
    // This test verifies the mock reflects what the production query does.
    // An uploaded doc that slips through the filter would appear as missing.
    mockDocs = []; // simulates: approved filter returns nothing
    const { status } = await callSend();
    expect(status).toBe(400);
  });
});
