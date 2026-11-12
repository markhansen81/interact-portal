/**
 * Tests for POST /api/admin/insurance-orders/repair
 *
 * Covers: successful repair, failed email delivery, retry after failed fee
 * update (email already sent), and skipping already-sent correction email.
 *
 * All external services (Supabase, Resend, storage, Slack) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock declarations (must be before imports that use them) ──────────────────

const mockGetUser = vi.fn();
const mockProfileSelect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockProfileSelect,
        })),
      })),
    })),
  })),
}));

// Admin client mock is rebuilt per-test via the factory below
let mockAdminClient: ReturnType<typeof buildAdminClient>;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  insuranceOrderConfirmationEmail: vi.fn(() => ({
    subject: "Insurance Confirmation",
    html: "<p>Confirmation</p>",
  })),
}));

vi.mock("@/lib/insurance-invoice-pdf", () => ({
  generateInsuranceInvoicePDF: vi.fn(() => Buffer.from("pdf-bytes")),
}));

vi.mock("@/lib/storage", () => ({
  getSecureUrl: vi.fn(async () => "https://cdn.example.com/invoice.pdf"),
}));

vi.mock("@/lib/slack", () => ({
  sendSlackAlert: vi.fn(async () => {}),
}));

// ── Admin client factory ──────────────────────────────────────────────────────

type UpdateErrors = {
  pdfUrl?: string;
  repairEmailSentAt?: string;
  fee?: string;
};

const BASE_ORDER = {
  id: "order-1",
  order_number: "ORD-001",
  squarespace_order_id: null,
  created_at: "2026-01-15T10:00:00Z",
  participation_fee: 12900,
  repair_email_sent_at: null as string | null,
  customer_email: "parent@example.com",
  customer_first_name: "Maria",
  customer_last_name: "Muster",
  insured_first_name: "Max",
  insured_last_name: "Muster",
  school_name: "Grundschule Berlin",
  product_name: "Projektversicherung",
  total: 59,
  currency: "EUR",
  project_date: "2026-02-10",
  num_project_days: 5,
  invoice_pdf_url: null,
};

function buildAdminClient(opts: {
  orders?: typeof BASE_ORDER[];
  ordersError?: string | null;
  uploadError?: string | null;
  updateErrors?: UpdateErrors;
} = {}) {
  const {
    orders = [BASE_ORDER],
    ordersError = null,
    uploadError = null,
    updateErrors = {},
  } = opts;

  const updateCalls: Record<string, unknown>[] = [];

  const makeUpdateChain = (data: Record<string, unknown>) => {
    updateCalls.push(data);
    let error: string | null = null;
    if ("invoice_pdf_url" in data) error = updateErrors.pdfUrl ?? null;
    else if ("repair_email_sent_at" in data) error = updateErrors.repairEmailSentAt ?? null;
    else if ("participation_fee" in data) error = updateErrors.fee ?? null;
    return {
      eq: vi.fn().mockResolvedValue({ error: error ? { message: error } : null }),
    };
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "insurance_orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: ordersError ? null : orders,
              error: ordersError ? { message: ordersError } : null,
            }),
          }),
          update: vi.fn().mockImplementation(makeUpdateChain),
        };
      }
      return {};
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          error: uploadError ? { message: uploadError } : null,
        }),
      }),
    },
    _updateCalls: updateCalls,
  };

  return client;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: "admin-id" } } });
  mockProfileSelect.mockResolvedValue({ data: { role: "admin" } });
}

async function callRepair() {
  const { POST } = await import("@/app/api/admin/insurance-orders/repair/route");
  const response = await POST();
  return response.json();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Insurance Repair — POST /api/admin/insurance-orders/repair", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupAuth();
    mockAdminClient = buildAdminClient();
  });

  it("successfully repairs an order: sends email and updates fee last", async () => {
    mockSendEmail.mockResolvedValue({ ok: true, id: "email-id-123" });

    const body = await callRepair();

    expect(body.ok).toBe(true);
    expect(body.repaired).toBe(1);
    expect(body.results[0].status).toBe("repaired");

    // Email was sent exactly once
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe("parent@example.com");
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("[Korrektur]");

    // Fee update is the last DB write (update calls: pdf_url, repair_email_sent_at, fee)
    const updates = mockAdminClient._updateCalls;
    expect(updates.at(-1)).toMatchObject({ participation_fee: 129 });
  });

  it("marks order as failed and does not update fee when email delivery fails", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "Provider rejected" });

    const body = await callRepair();

    expect(body.repaired).toBe(0);
    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toContain("Email delivery failed");

    // Fee must NOT have been updated
    const feeUpdate = mockAdminClient._updateCalls.find(
      (u) => "participation_fee" in u
    );
    expect(feeUpdate).toBeUndefined();
  });

  it("skips email send when repair_email_sent_at is already set (idempotent retry)", async () => {
    // Simulate: email was sent in a prior attempt but fee update then failed
    const orderWithEmailAlreadySent = {
      ...BASE_ORDER,
      repair_email_sent_at: "2026-11-12T10:00:00Z",
    };
    mockAdminClient = buildAdminClient({ orders: [orderWithEmailAlreadySent] });
    mockSendEmail.mockResolvedValue({ ok: true, id: "should-not-be-called" });

    const body = await callRepair();

    expect(body.repaired).toBe(1);
    // Email must NOT be sent again
    expect(mockSendEmail).not.toHaveBeenCalled();
    // Fee update must still run
    const feeUpdate = mockAdminClient._updateCalls.find(
      (u) => "participation_fee" in u
    );
    expect(feeUpdate).toMatchObject({ participation_fee: 129 });
  });

  it("leaves order retryable when fee update fails after email is sent", async () => {
    mockSendEmail.mockResolvedValue({ ok: true, id: "email-123" });
    mockAdminClient = buildAdminClient({ updateErrors: { fee: "DB timeout" } });

    const body = await callRepair();

    expect(body.repaired).toBe(0);
    expect(body.results[0].status).toBe("failed");
    expect(body.results[0].error).toContain("DB update fee");

    // repair_email_sent_at was persisted before the failed fee update
    const emailTsUpdate = mockAdminClient._updateCalls.find(
      (u) => "repair_email_sent_at" in u
    );
    expect(emailTsUpdate).toBeDefined();
  });
});
