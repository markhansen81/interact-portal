import { Resend } from "resend";
import { uploadDocumentToDATEV } from "@/lib/datev-api";

// Portal sends to invoices@ which auto-forwards to DATEV upload email.
// This avoids DATEV rejecting Resend's envelope sender.
export const DATEV_UPLOAD_EMAIL =
  "d6810779-6510-4ff9-ab1f-12424157e435@uploadmail.datev.de";
const DATEV_VIA_EMAIL = "invoices@interactenglish.de";

const DATEV_FROM_EMAIL = "noreply@interactenglish.de";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendToDATEV({
  pdf,
  filename,
  belegNumber,
  taName,
  type,
}: {
  pdf: Buffer;
  filename: string;
  belegNumber: string;
  taName: string;
  type: "expense" | "invoice";
}): Promise<{
  ok: boolean;
  method: "api" | "email";
  documentId?: string;
  error?: unknown;
}> {
  // --- Try DATEV API first ---
  const notes =
    type === "expense"
      ? `Auslagenerstattung ${belegNumber} - ${taName}`
      : `Rechnung ${belegNumber} - ${taName}`;

  try {
    const apiResult = await uploadDocumentToDATEV(pdf, filename, notes);

    if (apiResult.success) {
      console.log(
        "[DATEV] API upload OK, documentId:",
        apiResult.documentId,
        "beleg:",
        belegNumber
      );
      return {
        ok: true,
        method: "api",
        documentId: apiResult.documentId,
      };
    }

    // API returned an error — log and fall through to email
    console.warn("[DATEV] API upload failed, falling back to email:", apiResult.error);
  } catch (err) {
    console.warn("[DATEV] API upload threw, falling back to email:", err);
  }

  // --- Fallback: email pipeline ---
  const resend = getResend();
  if (!resend) {
    return { ok: false, method: "email", error: "No RESEND_API_KEY configured" };
  }

  const subject =
    type === "expense"
      ? `Auslagenerstattung ${belegNumber} - ${taName}`
      : `Rechnung ${belegNumber} - ${taName}`;

  try {
    const { data, error } = await resend.emails.send({
      from: DATEV_FROM_EMAIL,
      to: DATEV_VIA_EMAIL,
      subject,
      html: "<p>Beleg im Anhang.</p>",
      attachments: [{ filename, content: pdf }],
    });

    if (error) {
      console.error("[DATEV] Resend error:", error);
      return { ok: false, method: "email", error };
    }

    if (!data?.id) {
      console.error("[DATEV] No email ID returned from Resend");
      return { ok: false, method: "email", error: "No email ID returned" };
    }

    console.log("[DATEV] Sent via email:", data.id, "beleg:", belegNumber);
    return { ok: true, method: "email" };
  } catch (error) {
    console.error("[DATEV] Email fallback failed:", error);
    return { ok: false, method: "email", error };
  }
}
