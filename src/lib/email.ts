import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "InterACT Portal <noreply@interactenglish.de>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("[EMAIL] Failed:", error);
  }
}

// --- Email Templates ---

export function workOrderSentEmail(taName: string, projectName: string, signByDate: string | null) {
  return {
    subject: `New Work Order: ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">New Work Order</h2>
        <p>Hi ${taName},</p>
        <p>You have a new work order for <strong>${projectName}</strong> waiting for your signature.</p>
        ${signByDate ? `<p style="color: #b45309; font-weight: bold;">Please sign by ${signByDate}</p>` : ""}
        <p><a href="${APP_URL}/portal/work-orders" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Work Order</a></p>
        <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
      </div>
    `,
  };
}

export function invoiceSubmittedEmail(taName: string, invoiceNumber: string, total: number) {
  return {
    subject: `Invoice ${invoiceNumber} submitted by ${taName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">Invoice Submitted</h2>
        <p><strong>${taName}</strong> has submitted invoice <strong>${invoiceNumber}</strong> for <strong>€${total.toFixed(2)}</strong>.</p>
        <p><a href="${APP_URL}/admin/invoices" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Review Invoice</a></p>
      </div>
    `,
  };
}

export function documentExpiringEmail(taName: string, docType: string, expiryDate: string) {
  return {
    subject: `Document expiring soon: ${docType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #b45309;">Document Expiring Soon</h2>
        <p>Hi ${taName},</p>
        <p>Your <strong>${docType}</strong> expires on <strong>${expiryDate}</strong>.</p>
        <p>Please upload a renewed document as soon as possible.</p>
        <p><a href="${APP_URL}/portal/documents" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Update Documents</a></p>
        <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
      </div>
    `,
  };
}

export function nudgeEmail(taName: string, item: string, message: string) {
  return {
    subject: `Reminder: ${item}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">Reminder</h2>
        <p>Hi ${taName},</p>
        <p>${message}</p>
        <p><a href="${APP_URL}/portal" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Go to Portal</a></p>
        <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
      </div>
    `,
  };
}

export function newMessageEmail(recipientName: string, senderName: string) {
  return {
    subject: `New message from ${senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #18181b;">New Message</h2>
        <p>Hi ${recipientName},</p>
        <p>You have a new message from <strong>${senderName}</strong>.</p>
        <p><a href="${APP_URL}/portal/messages" style="display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Read Message</a></p>
        <p style="color: #71717a; font-size: 14px;">InterACT English gGmbH</p>
      </div>
    `,
  };
}
